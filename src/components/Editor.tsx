import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as Ably from 'ably';
import '../App.css';
import {
  Download, Trash2,
  MousePointer2, Pen, Type,
  User,
  ArrowLeft, ArrowRight, LayoutGrid,
  ChevronLeft
} from 'lucide-react';
import {
  Stage as KStage,
  Layer as KLayer,
  Rect as KRect,
  Line as KLine,
  Circle as KCircle,
  Arc as KArc,
  Group as KGroup,
  Text as KText,
  Arrow as KArrow
} from 'react-konva';

const USER_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1'];

type ObjType = 'player-red' | 'player-blue' | 'ball' | 'text';
interface BoardObject {
  id: string;
  type: ObjType;
  x: number;
  y: number;
  text?: string;
  number?: string;
  label?: string;
  rotation?: number; // degrees
  color?: string;
}

interface DrawnLine {
  id: string;
  type: 'free' | 'straight' | 'arrow';
  points: number[];
  color: string;
  width: number;
  x?: number;
  y?: number;
}


export function Editor() {
  const { id } = useParams<{ id: string }>();
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('soccerBoardUserName'));
  const [tempUserName, setTempUserName] = useState('');
  const [showUserModal, setShowUserModal] = useState(!userName);
  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const ablyChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const [userColor, setUserColor] = useState<string>('#10b981');
  const [remoteUsers, setRemoteUsers] = useState<{ id: string, name: string, x: number, y: number, color: string }[]>([]);
  const isRemoteUpdate = useRef(false);

  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'pen' | 'line' | 'arrow' | 'text'
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dragStartPositions = useRef<Map<string, { x: number, y: number }>>(new Map());
  const activeDraggingIds = useRef<string[]>([]);
  const isDraggingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const lastCursorUpdateRef = useRef(0);
  const lastCursorPosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const lastStateBroadcastRef = useRef(0);

  // Responsive Scale State
  const [stageScale, setStageScale] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // History State
  const [history, setHistory] = useState<{ objects: BoardObject[], lines: DrawnLine[] }[]>([]);
  const [future, setFuture] = useState<{ objects: BoardObject[], lines: DrawnLine[] }[]>([]);

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number, visible: boolean }>({
    x1: 0, y1: 0, x2: 0, y2: 0, visible: false
  });

  // Custom Modal States
  const [showTextModal, setShowTextModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const [boardName, setBoardName] = useState('Untitled Board');
  const [clipboard, setClipboard] = useState<{ objects: BoardObject[], lines: DrawnLine[] } | null>(null);

  const stageRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const selectionStartRef = useRef<{ x: number, y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const isDrawing = useRef(false);
  const wasDraggingRef = useRef(false);

  const PITCH_WIDTH = 600;
  const PITCH_HEIGHT = 900;

  const lastSavedDataRef = useRef<string>('');

  const fetchBoard = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/boards?id=${id}`);
      if (response.ok) {
        const board = await response.json();
        if (board) {
          setBoardName(board.name);
          const parsedData = typeof board.data === 'string' ? JSON.parse(board.data) : board.data;
          setObjects(parsedData.objects || []);
          setLines(parsedData.lines || []);
          lastSavedDataRef.current = JSON.stringify(parsedData);
        }
      }
    } catch (e) {
      console.error('Failed to fetch board:', e);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [id]);


  useEffect(() => {
    if (!userName || !id) return;

    let cancelled = false;
    const clientId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const color = USER_COLORS[Math.abs(clientId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % USER_COLORS.length];
    setUserColor(color);

    const ably = new Ably.Realtime({
      authUrl: '/api/ably-auth',
      authParams: { clientId },
      clientId,
    });
    ablyClientRef.current = ably;

    const channel = ably.channels.get(`board:${id}`);
    // Delay settingablyChannelRef until connection is ready

    const setupAbly = async () => {
      try {
        // Wait for connection to be established
        await ably.connection.once('connected');
        if (cancelled) return;

        ablyChannelRef.current = channel;

        // Enter presence with user info
        await channel.presence.enter({ name: userName, color, x: 0, y: 0 });
        if (cancelled) return;

        // Listen for presence changes to track remote users
        const updatePresence = async () => {
          if (cancelled) return;
          try {
            const members = await channel.presence.get();
            if (cancelled) return;
            const others = members
              .filter(m => m.clientId !== clientId)
              .map(m => ({
                id: m.clientId,
                name: (m.data as any)?.name || 'Unknown',
                x: (m.data as any)?.x || 0,
                y: (m.data as any)?.y || 0,
                color: (m.data as any)?.color || '#999',
              }));
            setRemoteUsers(others);
          } catch { /* ignore if cancelled */ }
        };

        channel.presence.subscribe('enter', updatePresence);
        channel.presence.subscribe('leave', updatePresence);
        channel.presence.subscribe('update', (msg) => {
          if (cancelled || msg.clientId === clientId) return;
          setRemoteUsers(prev => {
            const exists = prev.find(u => u.id === msg.clientId);
            if (exists) {
              return prev.map(u => u.id === msg.clientId ? {
                ...u,
                x: (msg.data as any)?.x ?? u.x,
                y: (msg.data as any)?.y ?? u.y,
                name: (msg.data as any)?.name ?? u.name,
              } : u);
            } else {
              return [...prev, {
                id: msg.clientId!,
                name: (msg.data as any)?.name || 'Unknown',
                x: (msg.data as any)?.x || 0,
                y: (msg.data as any)?.y || 0,
                color: (msg.data as any)?.color || '#999',
              }];
            }
          });
        });

        // Listen for state changes from other users
        channel.subscribe('state-change', (msg) => {
          if (cancelled || msg.clientId === clientId) return;
          isRemoteUpdate.current = true;
          setObjects(msg.data.objects);
          setLines(msg.data.lines);
        });

        await updatePresence();
      } catch (err) {
        if (!cancelled) console.warn('Ably setup error:', err);
      }
    };

    setupAbly();

    return () => {
      cancelled = true;
      ablyChannelRef.current = null;
      ablyClientRef.current = null;
      try {
        channel.presence.unsubscribe();
        channel.unsubscribe();
      } catch { /* already cleaned up */ }
      // Close connection asynchronously to avoid blocking
      ably.connection.once('closed', () => { });
      ably.close();
    };
  }, [userName, id]);

  const doAutoSave = () => {
    if (!id) return;
    const currentObjects = objects;
    const currentLines = lines;
    const dataToSave = { objects: currentObjects, lines: currentLines };
    lastSavedDataRef.current = JSON.stringify(dataToSave);
    setTimeout(async () => {
      try {
        await fetch(`/api/boards?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: dataToSave }),
        });

        // Broadcast state change via Ably
        if (ablyChannelRef.current && ablyClientRef.current?.connection.state === 'connected') {
          try {
            await ablyChannelRef.current.publish('state-change', dataToSave);
          } catch (e) {
            // Silently ignore if connection was just closed
          }
        }
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 500);
  };

  useEffect(() => {
    // Skip broadcasting if the change came from a remote update
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (objects.length > 0 || lines.length > 0) {
      localStorage.setItem('soccerBoardObjects', JSON.stringify(objects));
      localStorage.setItem('soccerBoardLines', JSON.stringify(lines));

      // Broadcast state change via Ably
      if (ablyChannelRef.current && ablyClientRef.current?.connection.state === 'connected' && remoteUsers.length > 0) {
        const now = Date.now();
        // Throttle state updates: max once every 500ms if drawing/dragging, otherwise immediate
        if (!isDrawing.current && !isDraggingRef.current) {
          try {
            ablyChannelRef.current.publish('state-change', { objects, lines });
            lastStateBroadcastRef.current = now;
          } catch (e) { /* Ignore */ }
        } else if (now - lastStateBroadcastRef.current > 500) {
          try {
            ablyChannelRef.current.publish('state-change', { objects, lines });
            lastStateBroadcastRef.current = now;
          } catch (e) { /* Ignore */ }
        }
      }

      // Auto-save to DB — defer if currently dragging
      if (isDraggingRef.current) {
        pendingSaveRef.current = true;
      } else if (id) {
        const saveTimer = setTimeout(async () => {
          const dataToSave = { objects, lines };
          lastSavedDataRef.current = JSON.stringify(dataToSave);
          try {
            await fetch(`/api/boards?id=${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: dataToSave }),
            });
          } catch (e) {
            console.error('Auto-save failed:', e);
          }
        }, 2000);
        return () => clearTimeout(saveTimer);
      }
    } else if (objects.length === 0 && lines.length === 0) {
      localStorage.removeItem('soccerBoardObjects');
      localStorage.removeItem('soccerBoardLines');

      if (ablyChannelRef.current && ablyClientRef.current?.connection.state === 'connected' && remoteUsers.length > 0) {
        try {
          ablyChannelRef.current.publish('state-change', { objects, lines });
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [objects, lines]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({ width: clientWidth, height: clientHeight });

        const containerWidth = clientWidth - 48; // padding
        const containerHeight = clientHeight - 48;
        const scaleW = containerWidth / PITCH_WIDTH;
        const scaleH = containerHeight / PITCH_HEIGHT;
        setStageScale(Math.min(scaleW, scaleH, 1)); // Don't scale up beyond 1
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stateRef = useRef({ objects, lines, selectedIds, clipboard });
  useEffect(() => {
    stateRef.current = { objects, lines, selectedIds, clipboard };
  }, [objects, lines, selectedIds, clipboard]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when an input or textarea is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const { objects, lines, selectedIds, clipboard } = stateRef.current;
      const isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + C (Copy)
      if (isMod && e.key.toLowerCase() === 'c') {
        if (selectedIds.length === 0) return;
        const selectedObjects = objects.filter(obj => selectedIds.includes(obj.id));
        const selectedLines = lines.filter(line => selectedIds.includes(line.id));
        setClipboard({
          objects: structuredClone(selectedObjects),
          lines: structuredClone(selectedLines)
        });
        e.preventDefault();
      }

      // Ctrl/Cmd + V (Paste)
      if (isMod && e.key.toLowerCase() === 'v') {
        if (!clipboard) return;
        saveToHistory();

        const timestamp = Date.now();
        const newObjects = clipboard.objects.map((obj, i) => ({
          ...obj,
          id: `copy-${timestamp}-obj-${i}`,
          x: obj.x + 20,
          y: obj.y + 20
        }));

        const newLines = clipboard.lines.map((line, i) => ({
          ...line,
          id: `copy-${timestamp}-line-${i}`,
          x: (line.x || 0) + 20,
          y: (line.y || 0) + 20
        }));

        setObjects(prev => [...prev, ...newObjects]);
        setLines(prev => [...prev, ...newLines]);
        setSelectedIds([...newObjects.map(o => o.id), ...newLines.map(l => l.id)]);
        e.preventDefault();
      }

      // Backspace or Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.length > 0) {
          deleteSelectedObjects();
          e.preventDefault();
        }
      }

      // Ctrl/Cmd + Z (Undo)
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        undoLastAction();
        e.preventDefault();
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z (Redo)
      if ((isMod && e.key.toLowerCase() === 'y') || (isMod && e.shiftKey && e.key.toLowerCase() === 'z')) {
        redoAction();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddObject = (type: ObjType) => {
    // Ball limit: only 1 allowed
    if (type === 'ball') {
      const ballCount = objects.filter(o => o.type === 'ball').length;
      if (ballCount >= 1) return;
    }
    // Away (player-blue) limit: max 11
    if (type === 'player-blue') {
      const awayCount = objects.filter(o => o.type === 'player-blue').length;
      if (awayCount >= 11) return;
    }
    saveToHistory();
    const newObj: BoardObject = {
      id: `${type}-${Date.now()}`,
      type,
      x: PITCH_WIDTH / 2,
      y: PITCH_HEIGHT / 2
    };
    setObjects([...objects, newObj]);
    setActiveTool('select');
  };

  const handleApplyFormation = (scheme: string) => {
    saveToHistory();
    if (scheme === '4-4-2') {
      const formation442: BoardObject[] = [
        { id: `red-gk-${Date.now()}`, type: 'player-red', x: 300, y: 780 },
        { id: `red-lb-${Date.now()}`, type: 'player-red', x: 100, y: 650 },
        { id: `red-cb1-${Date.now()}`, type: 'player-red', x: 230, y: 680 },
        { id: `red-cb2-${Date.now()}`, type: 'player-red', x: 370, y: 680 },
        { id: `red-rb-${Date.now()}`, type: 'player-red', x: 500, y: 650 },
        { id: `red-lm-${Date.now()}`, type: 'player-red', x: 100, y: 500 },
        { id: `red-cm1-${Date.now()}`, type: 'player-red', x: 250, y: 530 },
        { id: `red-cm2-${Date.now()}`, type: 'player-red', x: 350, y: 530 },
        { id: `red-rm-${Date.now()}`, type: 'player-red', x: 500, y: 500 },
        { id: `red-st1-${Date.now()}`, type: 'player-red', x: 250, y: 400 },
        { id: `red-st2-${Date.now()}`, type: 'player-red', x: 350, y: 400 },
      ];
      setLines([]);
      const otherObjects = objects.filter(obj => obj.type !== 'player-red');
      setObjects([...otherObjects, ...formation442]);
    } else if (scheme === '4-2-3-1') {
      const formation4231: BoardObject[] = [
        { id: `red-gk-${Date.now()}`, type: 'player-red', x: 300, y: 780 },
        { id: `red-lb-${Date.now()}`, type: 'player-red', x: 100, y: 650 },
        { id: `red-cb1-${Date.now()}`, type: 'player-red', x: 230, y: 680 },
        { id: `red-cb2-${Date.now()}`, type: 'player-red', x: 370, y: 680 },
        { id: `red-rb-${Date.now()}`, type: 'player-red', x: 500, y: 650 },
        { id: `red-dm1-${Date.now()}`, type: 'player-red', x: 240, y: 580 },
        { id: `red-dm2-${Date.now()}`, type: 'player-red', x: 360, y: 580 },
        { id: `red-lm-${Date.now()}`, type: 'player-red', x: 100, y: 460 },
        { id: `red-am-${Date.now()}`, type: 'player-red', x: 300, y: 460 },
        { id: `red-rm-${Date.now()}`, type: 'player-red', x: 500, y: 460 },
        { id: `red-st-${Date.now()}`, type: 'player-red', x: 300, y: 350 },
      ];
      setLines([]);
      const otherObjects = objects.filter(obj => obj.type !== 'player-red');
      setObjects([...otherObjects, ...formation4231]);
    }
    setActiveTool('select');
  };

  const saveToHistory = () => {
    setHistory(prev => [...prev, { objects: structuredClone(objects), lines: structuredClone(lines) }].slice(-20));
    setFuture([]);
  };


  const handleDragStart = (e: any, idsToUse: string[]) => {
    saveToHistory();
    isDraggingRef.current = true;
    activeDraggingIds.current = idsToUse;
    const stage = e.target.getStage();
    const newStarts = new Map();

    idsToUse.forEach(id => {
      const node = stage.findOne(`#${id}`);
      if (node) {
        newStarts.set(id, { x: node.x(), y: node.y() });
      }
    });
    dragStartPositions.current = newStarts;
  };

  const handleDragMove = (e: any, id: string) => {
    const idsToMove = activeDraggingIds.current;
    if (!idsToMove.includes(id)) return;

    const node = e.target;
    const startPos = dragStartPositions.current.get(id);
    if (!startPos) return;

    const dx = node.x() - startPos.x;
    const dy = node.y() - startPos.y;

    const layer = node.getLayer();
    idsToMove.forEach(sid => {
      if (sid === id) return;
      const otherNode = layer.findOne(`#${sid}`);
      if (otherNode) {
        const otherStart = dragStartPositions.current.get(sid);
        if (otherStart) {
          otherNode.x(otherStart.x + dx);
          otherNode.y(otherStart.y + dy);
        }
      }
    });
  };

  const handleDragEnd = (e: any, _id: string) => {
    const stage = e.target.getStage();
    const idsToUpdate = activeDraggingIds.current;

    // Update all moved items in state
    const newObjects = [...objects];
    const newLines = [...lines];
    let changed = false;

    idsToUpdate.forEach(sid => {
      const node = stage.findOne(`#${sid}`);
      if (node) {
        const objIdx = newObjects.findIndex(o => o.id === sid);
        if (objIdx !== -1) {
          newObjects[objIdx] = { ...newObjects[objIdx], x: node.x(), y: node.y() };
          changed = true;
        } else {
          const lineIdx = newLines.findIndex(l => l.id === sid);
          if (lineIdx !== -1) {
            newLines[lineIdx] = { ...newLines[lineIdx], x: node.x(), y: node.y() };
            changed = true;
          }
        }
      }
    });

    if (changed) {
      setObjects(newObjects);
      setLines(newLines);
    }
    activeDraggingIds.current = [];
    isDraggingRef.current = false;

    // Execute deferred auto-save after drag ends
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      doAutoSave();
    }
  };

  const redoAction = () => {
    if (future.length === 0) return;
    const nextState = future[future.length - 1];
    setHistory(prev => [...prev, { objects, lines }]);
    setObjects(nextState.objects);
    setLines(nextState.lines);
    setFuture(prev => prev.slice(0, -1));
  };

  const updateObject = (id: string, updates: Partial<BoardObject>) => {
    setObjects(objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  };

  const handleMouseDown = (e: any) => {
    const layer = layerRef.current;
    if (!layer) return;
    const pos = layer.getRelativePointerPosition();
    if (!pos) return;

    if (activeTool === 'text') {
      setPendingTextPos(pos);
      setTextInputValue('');
      setShowTextModal(true);
      return;
    }

    if (activeTool === 'select') {
      const stage = e.target.getStage();
      const isModifier = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;

      if (e.target === stage || e.target.name() === 'pitch-bg' || e.target.name() === 'board-bg') {
        selectionStartRef.current = { x: pos.x, y: pos.y };
        isSelectingRef.current = true;
        setSelectionBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, visible: true });
        if (!isModifier) {
          setSelectedIds([]);
        }
      }
      return;
    }

    if (activeTool !== 'pen' && activeTool !== 'line' && activeTool !== 'arrow') return;

    saveToHistory();
    isDrawing.current = true;
    const newLine: DrawnLine = {
      id: `line-${Date.now()}`,
      type: (activeTool === 'pen' ? 'free' : activeTool) as 'free' | 'straight' | 'arrow',
      points: [pos.x, pos.y, pos.x, pos.y],
      color: '#db2777',
      width: 4,
      x: 0,
      y: 0
    };
    setLines([...lines, newLine]);
  };

  const handleModalSubmit = () => {
    if (textInputValue) {
      saveToHistory();
      setObjects([...objects, {
        id: `text-${Date.now()}`,
        type: 'text',
        x: pendingTextPos.x,
        y: pendingTextPos.y,
        text: textInputValue
      }]);
    }
    setShowTextModal(false);
    setActiveTool('select');
  };

  const handleUserModalSubmit = () => {
    if (tempUserName.trim()) {
      setUserName(tempUserName.trim());
      localStorage.setItem('soccerBoardUserName', tempUserName.trim());
      setShowUserModal(false);
    }
  };

  const handleMouseMove = (_e: any) => {
    const layer = layerRef.current;
    if (!layer) return;
    const pos = layer.getRelativePointerPosition();
    if (!pos) return;

    // Throttle Ably cursor presence updates
    const now = Date.now();
    const lastPos = lastCursorPosRef.current;
    const dist = Math.sqrt(Math.pow(pos.x - lastPos.x, 2) + Math.pow(pos.y - lastPos.y, 2));

    if (ablyChannelRef.current && ablyClientRef.current?.connection.state === 'connected' && remoteUsers.length > 0) {
      // Update if:
      // 1. 250ms passed AND moved > 5px
      // 2. OR it's been a long time (e.g. 2 seconds) regardless of distance (to ensure sync eventually)
      if ((now - lastCursorUpdateRef.current > 250 && dist > 5) || (now - lastCursorUpdateRef.current > 2000)) {
        lastCursorUpdateRef.current = now;
        lastCursorPosRef.current = { x: pos.x, y: pos.y };
        try {
          ablyChannelRef.current.presence.update({ name: userName, color: userColor, x: pos.x, y: pos.y });
        } catch (e) {
          // Silently ignore presence update errors
        }
      }
    }

    if (selectionStartRef.current && isSelectingRef.current) {
      const startPos = selectionStartRef.current;
      setSelectionBox({
        x1: startPos.x,
        y1: startPos.y,
        x2: pos.x,
        y2: pos.y,
        visible: true
      });
      const x1 = Math.min(startPos.x, pos.x);
      const y1 = Math.min(startPos.y, pos.y);
      const x2 = Math.max(startPos.x, pos.x);
      const y2 = Math.max(startPos.y, pos.y);

      const inBoxObjects = objects.filter(obj =>
        obj.x >= x1 && obj.x <= x2 && obj.y >= y1 && obj.y <= y2
      ).map(o => o.id);

      const inBoxLines = lines.filter(line => {
        const pts = line.points;
        const lx = (line.x || 0);
        const ly = (line.y || 0);
        for (let i = 0; i < pts.length; i += 2) {
          const px = pts[i] + lx;
          const py = pts[i + 1] + ly;
          if (px >= x1 && px <= x2 && py >= y1 && py <= y2) return true;
        }
        return false;
      }).map(l => l.id);

      const isModifier = _e.evt.shiftKey || _e.evt.metaKey || _e.evt.ctrlKey;
      if (isModifier) {
        setSelectedIds(prev => Array.from(new Set([...prev, ...inBoxObjects, ...inBoxLines])));
      } else {
        setSelectedIds([...inBoxObjects, ...inBoxLines]);
      }
      return;
    }

    if (!isDrawing.current || (activeTool !== 'pen' && activeTool !== 'line' && activeTool !== 'arrow')) return;

    setLines(prev => {
      if (prev.length === 0) return prev;
      const newLines = [...prev];
      const lastLine = { ...newLines[newLines.length - 1] };

      if (lastLine.type === 'free') {
        lastLine.points = [...lastLine.points, pos.x, pos.y];
      } else {
        lastLine.points = [lastLine.points[0], lastLine.points[1], pos.x, pos.y];
      }

      newLines[newLines.length - 1] = lastLine;
      return newLines;
    });
  };

  const handleMouseUp = () => {
    if (selectionBox.visible || isSelectingRef.current) {
      setSelectionBox(prev => ({ ...prev, visible: false }));
      selectionStartRef.current = null;
      isSelectingRef.current = false;
      // Mark that we were selecting to prevent immediate onClick clearing
      wasDraggingRef.current = true;
      setTimeout(() => { wasDraggingRef.current = false; }, 100);
    }
    isDrawing.current = false;
  };

  const clearBoard = () => {
    saveToHistory();
    setObjects([]);
    setLines([]);
    setShowConfirmModal(false);
  };

  const deleteSelectedObjects = () => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setObjects(objects.filter(obj => !selectedIds.includes(obj.id)));
    setLines(lines.filter(line => !selectedIds.includes(line.id)));
    setSelectedIds([]);
  };

  const undoLastAction = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setFuture(prev => [...prev, { objects, lines }]);
    setObjects(previousState.objects);
    setLines(previousState.lines);
    setHistory(prev => prev.slice(0, -1));
  };

  const exportImage = (scope: 'pitch' | 'full') => {
    if (!stageRef.current) return;

    let exportOptions: any = {
      pixelRatio: 2,
      mimeType: 'image/png'
    };

    if (scope === 'pitch') {
      // The pitch is 600x900, centered or at origin? 
      // Based on Pitch component, it's drawn at 0,0 but let's check
      exportOptions = {
        ...exportOptions,
        x: 0,
        y: 0,
        width: PITCH_WIDTH,
        height: PITCH_HEIGHT
      };
    }

    const uri = stageRef.current.toDataURL(exportOptions);

    // Check if URI is valid
    if (!uri || uri === 'data:,') {
      alert('Failed to generate image. Please try again.');
      return;
    }

    const link = document.createElement('a');
    link.download = `tactics_${scope}_${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  // Ball icon for sidebar (DOM)
  const BallIconDOM = () => (
    <div style={{
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: '2px solid #000',
        backgroundColor: '#fff'
      }} />
    </div>
  );

  return (
    <div className="app-container">
      {/* User Name Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Set Your Name</h3>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>Enter a name to show other users when collaborating.</p>
            <input
              type="text"
              autoFocus
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleUserModalSubmit();
                }
              }}
              placeholder="Your Name"
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowUserModal(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={handleUserModalSubmit} style={{ flex: 1 }}>
                Start Collaborating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Export Image</h3>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>Choose the export area:</p>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: '10px' }}>
              <button className="modal-btn primary" onClick={() => exportImage('pitch')} style={{ width: '100%' }}>
                Pitch Only (600x900)
              </button>
              <button className="modal-btn primary" onClick={() => exportImage('full')} style={{ width: '100%', backgroundColor: '#6366f1' }}>
                Full Board
              </button>
              <button className="modal-btn cancel" onClick={() => setShowExportModal(false)} style={{ width: '100%' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Text Modal */}
      {showTextModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Add Text</h3>
            <input
              type="text"
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleModalSubmit();
                }
              }}
              placeholder="Enter text here..."
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowTextModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleModalSubmit}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Clear Board?</h3>
            <p style={{ color: '#aaa', marginBottom: '20px' }}>This will remove all players and drawings. This action can be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowConfirmModal(false)}>Cancel</button>
              <button className="modal-btn primary" style={{ backgroundColor: '#ef4444', color: 'white' }} onClick={clearBoard}>Clear All</button>
            </div>
          </div>
        </div>
      )}


      {/* Header */}
      <header className="header">
        <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/" className="back-link" title="Back to Dashboard">
              <ChevronLeft size={24} />
            </Link>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Soccer Tactical Board</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{boardName}</span>
            </div>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: userColor,
              border: '2px solid white',
              boxShadow: '0 0 4px rgba(0,0,0,0.2)'
            }} title="Your collaboration color" />
          </div>

          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            <button className="icon-btn" title="Undo" onClick={undoLastAction} disabled={history.length === 0}><ArrowLeft size={20} /></button>
            <button className="icon-btn" title="Redo" onClick={redoAction} disabled={future.length === 0}><ArrowRight size={20} /></button>
            <button className="icon-btn" title="Clear Board" onClick={() => setShowConfirmModal(true)}><Trash2 size={20} /></button>
            <button className="icon-btn" title="Export Image" onClick={() => setShowExportModal(true)}><Download size={20} /></button>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar" onClick={(e) => e.stopPropagation()}>
          <div className="tool-group">
            <div className="tool-group-label">Tools</div>
            <div className="tool-grid">
              <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select / Move">
                <MousePointer2 size={20} />
                <span>Move</span>
              </button>
              <button className={`tool-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Draw Freehand">
                <Pen size={20} />
                <span>Draw</span>
              </button>
              <button className={`tool-btn ${activeTool === 'line' ? 'active' : ''}`} onClick={() => setActiveTool('line')} title="Draw Straight Line">
                <div style={{ height: 20, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 18, borderBottom: '2px solid currentColor' }} />
                </div>
                <span>Line</span>
              </button>
              <button className={`tool-btn ${activeTool === 'arrow' ? 'active' : ''}`} onClick={() => setActiveTool('arrow')} title="Draw Arrow">
                <ArrowRight size={20} />
                <span>Arrow</span>
              </button>
              <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Add Text">
                <Type size={20} />
                <span>Text</span>
              </button>
            </div>
          </div>

          <div className="tool-group">
            <div className="tool-group-label">Elements</div>
            <div className="tool-grid">
              <button className="tool-btn" onClick={() => handleAddObject('player-red')}>
                <User size={24} color="#ef4444" />
                <span>Home</span>
              </button>
              <button className="tool-btn" onClick={() => handleAddObject('player-blue')}>
                <User size={24} color="#3b82f6" />
                <span>Away</span>
              </button>
              <button className="tool-btn" onClick={() => handleAddObject('ball')}>
                <BallIconDOM />
                <span>Ball</span>
              </button>
            </div>
          </div>

          <div className="tool-group">
            <div className="tool-group-label">Formations (Red)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button className="formation-btn" onClick={() => handleApplyFormation('4-4-2')}>
                <LayoutGrid size={16} />
                4 - 4 - 2
              </button>
              <button className="formation-btn" onClick={() => handleApplyFormation('4-2-3-1')}>
                <LayoutGrid size={16} />
                4 - 2 - 3 - 1
              </button>
            </div>
          </div>

        </aside>

        {/* Board Area */}
        <main className="board-container" ref={containerRef}>
          <KStage
            width={containerSize.width}
            height={containerSize.height}
            ref={stageRef}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              const name = e.target.name();
              if (e.target === stage || name === 'pitch-bg' || name === 'board-bg') {
                handleMouseDown(e);
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={(e) => {
              const stage = e.target.getStage();
              const name = e.target.name();
              if ((e.target === stage || name === 'pitch-bg' || name === 'board-bg') && !wasDraggingRef.current) {
                setSelectedIds([]);
              }
            }}
          >
            <KLayer
              ref={layerRef}
              x={(containerSize.width - PITCH_WIDTH * stageScale) / 2}
              y={(containerSize.height - PITCH_HEIGHT * stageScale) / 2}
              scaleX={stageScale}
              scaleY={stageScale}
            >
              {/* Board Background to catch events on the whole stage area */}
              <KRect
                name="board-bg"
                x={-2000}
                y={-2000}
                width={4000}
                height={4000}
                fill="#e0e0e0"
              />

              {/* Pitch Background */}
              <KRect name="pitch-bg" width={PITCH_WIDTH} height={PITCH_HEIGHT} fill="#ffffff" shadowBlur={10} shadowColor="rgba(0,0,0,0.1)" />

              {/* Pitch Outlines */}
              <KLine
                points={[20, 20, PITCH_WIDTH - 20, 20, PITCH_WIDTH - 20, PITCH_HEIGHT - 20, 20, PITCH_HEIGHT - 20, 20, 20]}
                stroke="#000000"
                strokeWidth={2}
              />

              {/* Halfway Line */}
              <KLine
                points={[20, PITCH_HEIGHT / 2, PITCH_WIDTH - 20, PITCH_HEIGHT / 2]}
                stroke="#000000"
                strokeWidth={2}
              />

              {/* Center Circle */}
              <KCircle
                x={PITCH_WIDTH / 2}
                y={PITCH_HEIGHT / 2}
                radius={70}
                stroke="#000000"
                strokeWidth={2}
              />

              {/* Top Penalty Area */}
              <KRect
                x={PITCH_WIDTH / 2 - 120}
                y={20}
                width={240}
                height={110}
                stroke="#000000"
                strokeWidth={2}
              />
              {/* Top Penalty Arc - Center is Penalty Spot (11m from goal line) */}
              <KArc
                x={PITCH_WIDTH / 2}
                y={20 + (11 * (110 / 16.5))}
                innerRadius={9.15 * (110 / 16.5)}
                outerRadius={9.15 * (110 / 16.5)}
                angle={106}
                rotation={37}
                stroke="#000000"
                strokeWidth={2}
              />

              {/* Bottom Penalty Area */}
              <KRect
                x={PITCH_WIDTH / 2 - 120}
                y={PITCH_HEIGHT - 130}
                width={240}
                height={110}
                stroke="#000000"
                strokeWidth={2}
              />
              {/* Bottom Penalty Arc - Center is Penalty Spot */}
              <KArc
                x={PITCH_WIDTH / 2}
                y={PITCH_HEIGHT - 20 - (11 * (110 / 16.5))}
                innerRadius={9.15 * (110 / 16.5)}
                outerRadius={9.15 * (110 / 16.5)}
                angle={106}
                rotation={217}
                stroke="#000000"
                strokeWidth={2}
              />

              {/* Goals and Areas */}
              <KRect x={PITCH_WIDTH / 2 - 50} y={20} width={100} height={40} stroke="#000000" strokeWidth={2} />
              <KRect x={PITCH_WIDTH / 2 - 50} y={PITCH_HEIGHT - 60} width={100} height={40} stroke="#000000" strokeWidth={2} />
              <KRect x={PITCH_WIDTH / 2 - 35} y={10} width={70} height={10} fill="#000000" />
              <KRect x={PITCH_WIDTH / 2 - 35} y={PITCH_HEIGHT - 20} width={70} height={10} fill="#000000" />

              {/* Drawn Lines */}
              {lines.map((line) => {
                const isSelected = selectedIds.includes(line.id);
                if (line.type === 'arrow') {
                  return (
                    <KArrow
                      key={line.id}
                      id={line.id}
                      x={line.x || 0}
                      y={line.y || 0}
                      points={line.points}
                      stroke={isSelected ? '#f59e0b' : line.color}
                      fill={isSelected ? '#f59e0b' : line.color}
                      strokeWidth={line.width}
                      pointerLength={10}
                      pointerWidth={10}
                      tension={0}
                      lineCap="round"
                      lineJoin="round"
                      draggable={activeTool === 'select'}
                      onDragStart={(e) => {
                        let idsToUse = selectedIds;
                        if (!selectedIds.includes(line.id)) {
                          idsToUse = [line.id];
                          setSelectedIds(idsToUse);
                        }
                        handleDragStart(e, idsToUse);
                      }}
                      onDragMove={(e) => handleDragMove(e, line.id)}
                      onDragEnd={(e) => handleDragEnd(e, line.id)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedIds([line.id]);
                      }}
                    />
                  );
                }
                return (
                  <KLine
                    key={line.id}
                    id={line.id}
                    x={line.x || 0}
                    y={line.y || 0}
                    points={line.points}
                    stroke={isSelected ? '#f59e0b' : line.color}
                    strokeWidth={line.width}
                    tension={line.type === 'free' || !line.type ? 0.5 : 0}
                    lineCap="round"
                    lineJoin="round"
                    draggable={activeTool === 'select'}
                    onDragStart={(e) => {
                      let idsToUse = selectedIds;
                      if (!selectedIds.includes(line.id)) {
                        idsToUse = [line.id];
                        setSelectedIds(idsToUse);
                      }
                      handleDragStart(e, idsToUse);
                    }}
                    onDragMove={(e) => handleDragMove(e, line.id)}
                    onDragEnd={(e) => handleDragEnd(e, line.id)}
                    onClick={(e) => {
                      const isModifier = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
                      if (isModifier) {
                        setSelectedIds(prev =>
                          prev.includes(line.id)
                            ? prev.filter(id => id !== line.id)
                            : [...prev, line.id]
                        );
                      } else {
                        setSelectedIds([line.id]);
                      }
                    }}
                  />
                );
              })}

              {/* Objects */}
              {objects.map((obj) => (
                <KGroup
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  draggable={activeTool === 'select'}
                  onDragStart={(e) => {
                    let idsToUse = selectedIds;
                    // If not already selected, select it immediately
                    if (!selectedIds.includes(obj.id)) {
                      idsToUse = [obj.id];
                      setSelectedIds(idsToUse);
                    }
                    handleDragStart(e, idsToUse);
                  }}
                  onDragMove={(e) => handleDragMove(e, obj.id)}
                  onDragEnd={(e) => handleDragEnd(e, obj.id)}
                  onClick={(e) => {
                    const isModifier = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
                    if (isModifier) {
                      e.cancelBubble = true;
                      setSelectedIds(prev =>
                        prev.includes(obj.id)
                          ? prev.filter(id => id !== obj.id)
                          : [...prev, obj.id]
                      );
                      return;
                    }

                    e.cancelBubble = true;
                    // Marker Swapping Logic
                    if (selectedIds.length === 1 && selectedIds[0] !== obj.id && obj.type.startsWith('player')) {
                      const selectedObj = objects.find(o => o.id === selectedIds[0]);
                      if (selectedObj && selectedObj.type.startsWith('player')) {
                        saveToHistory();
                        const newObjects = objects.map(o => {
                          if (o.id === obj.id) return { ...o, x: selectedObj.x, y: selectedObj.y };
                          if (o.id === selectedIds[0]) return { ...o, x: obj.x, y: obj.y };
                          return o;
                        });
                        setObjects(newObjects);
                        setSelectedIds([]); // Deselect after swap
                        return;
                      }
                    }
                    setSelectedIds([obj.id]);
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    setSelectedIds([obj.id]);
                  }}
                >
                  {obj.type === 'text' ? (
                    <KText
                      text={obj.text}
                      fontSize={24}
                      fill="#000000"
                      fontFamily="Arial"
                      fontStyle="bold"
                      stroke={selectedIds.includes(obj.id) ? '#f59e0b' : 'transparent'}
                      strokeWidth={1}
                      padding={4}
                      offsetX={10}
                    />
                  ) : obj.type.startsWith('player') ? (
                    <KGroup>
                      <KCircle
                        radius={18}
                        fill={obj.type === 'player-red' ? '#ef4444' : '#3b82f6'}
                        stroke={selectedIds.includes(obj.id) ? "#f59e0b" : "#ffffff"}
                        strokeWidth={selectedIds.includes(obj.id) ? 3 : 2}
                        shadowColor="rgba(0,0,0,0.3)"
                        shadowBlur={4}
                        shadowOffset={{ x: 0, y: 2 }}
                      />
                      {/* Number */}
                      <KText
                        text={obj.number || ''}
                        fontSize={14}
                        fill="#ffffff"
                        fontStyle="bold"
                        width={36}
                        align="center"
                        offsetX={18}
                        offsetY={7}
                      />
                      {/* Label */}
                      {obj.label && (
                        <KText
                          text={obj.label}
                          fontSize={12}
                          fill="#000000"
                          fontStyle="bold"
                          y={22}
                          width={100}
                          align="center"
                          offsetX={50}
                        />
                      )}
                    </KGroup>
                  ) : (
                    <KGroup>
                      <KCircle
                        radius={10}
                        fill="#ffffff"
                        stroke={selectedIds.includes(obj.id) ? "#f59e0b" : "#000000"}
                        strokeWidth={selectedIds.includes(obj.id) ? 3 : 1.5}
                      />
                      {selectedIds.includes(obj.id) && (
                        <KRect
                          x={-12}
                          y={-12}
                          width={24}
                          height={24}
                          stroke="#f59e0b"
                          strokeWidth={1}
                          dash={[3, 2]}
                        />
                      )}
                    </KGroup>
                  )}
                </KGroup>
              ))}

              {/* Selection Box UI */}
              {selectionBox.visible && (
                <KRect
                  x={Math.min(selectionBox.x1, selectionBox.x2)}
                  y={Math.min(selectionBox.y1, selectionBox.y2)}
                  width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                  height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                  fill="rgba(245, 158, 11, 0.15)"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  listening={false}
                />
              )}

              {/* Remote Cursors */}
              {remoteUsers.map((user) => (
                <KGroup key={user.id} x={user.x} y={user.y} listening={false}>
                  {/* Mouse Pointer Icon */}
                  <KLine
                    points={[0, 0, 0, 15, 4, 11, 7, 17, 9, 16, 6, 10, 11, 10, 0, 0]}
                    fill={user.color}
                    stroke="#ffffff"
                    strokeWidth={1}
                    closed
                    shadowColor="rgba(0,0,0,0.3)"
                    shadowBlur={2}
                    shadowOffset={{ x: 1, y: 1 }}
                  />
                  {/* User Name Tag */}
                  <KGroup x={12} y={12}>
                    <KRect
                      width={(() => {
                        let w = 0;
                        for (const ch of user.name) {
                          w += ch.charCodeAt(0) > 255 ? 14 : 8;
                        }
                        return w + 14;
                      })()}
                      height={20}
                      fill={user.color}
                      cornerRadius={4}
                      shadowColor="rgba(0,0,0,0.2)"
                      shadowBlur={2}
                    />
                    <KText
                      text={user.name}
                      fontSize={11}
                      fill="#ffffff"
                      fontStyle="bold"
                      padding={4}
                      align="center"
                    />
                  </KGroup>
                </KGroup>
              ))}
            </KLayer>
          </KStage>
        </main>

        {/* Properties Panel */}
        <aside className="properties-panel">
          {selectedIds.length === 1 ? (
            (() => {
              const selectedObj = objects.find(o => o.id === selectedIds[0]);
              if (!selectedObj) return <div className="no-selection">Select an object on the pitch to edit its properties.</div>;

              return (
                <div className="properties-content">
                  <h3 className="properties-title">Properties</h3>

                  {selectedObj.type.startsWith('player') && (
                    <>
                      <div className="prop-group">
                        <label>Number</label>
                        <input
                          type="text"
                          maxLength={3}
                          value={selectedObj.number || ''}
                          onChange={(e) => updateObject(selectedObj.id, { number: e.target.value })}
                        />
                      </div>
                      <div className="prop-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={selectedObj.label || ''}
                          onChange={(e) => updateObject(selectedObj.id, { label: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {selectedObj.type === 'text' && (
                    <div className="prop-group">
                      <label>Text</label>
                      <input
                        type="text"
                        value={selectedObj.text || ''}
                        onChange={(e) => updateObject(selectedObj.id, { text: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="prop-divider" />

                  <button className="delete-btn" onClick={deleteSelectedObjects}>
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                </div>
              );
            })()
          ) : selectedIds.length > 1 ? (
            <div className="properties-content">
              <h3 className="properties-title">Multiple Selected</h3>
              <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
                {selectedIds.length} objects selected.
              </p>
              <button className="delete-btn" onClick={deleteSelectedObjects}>
                <Trash2 size={16} />
                Delete All Selected
              </button>
            </div>
          ) : (
            <div className="no-selection">
              Select an object on the pitch to edit its properties.
            </div>
          )}
        </aside>
      </div>
    </div >
  );
}

