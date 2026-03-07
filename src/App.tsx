import { useState, useRef, useEffect } from 'react';
import './App.css';
import {
  Download, RotateCcw, Trash2,
  MousePointer2, Pen, Type,
  User,
  Minus, ArrowRight, LayoutGrid
} from 'lucide-react';
import { Stage, Layer, Rect, Line, Circle as KonvaCircle, Arc, Group, Text, Arrow } from 'react-konva';

type ObjType = 'player-red' | 'player-blue' | 'ball' | 'text';
interface BoardObject {
  id: string;
  type: ObjType;
  x: number;
  y: number;
  text?: string;
}

interface DrawnLine {
  id: string;
  type: 'free' | 'straight' | 'arrow';
  points: number[];
  color: string;
  width: number;
}

function App() {
  const [activeTool, setActiveTool] = useState('select'); // 'select' | 'pen' | 'line' | 'arrow' | 'text'
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [lines, setLines] = useState<DrawnLine[]>([]);

  // Custom Modal State
  const [showTextModal, setShowTextModal] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');

  const stageRef = useRef<any>(null);
  const isDrawing = useRef(false);

  const PITCH_WIDTH = 600;
  const PITCH_HEIGHT = 900;

  useEffect(() => {
    const savedObjects = localStorage.getItem('soccerBoardObjects');
    const savedLines = localStorage.getItem('soccerBoardLines');
    if (savedObjects) {
      try { setObjects(JSON.parse(savedObjects)); } catch (e) { }
    }
    if (savedLines) {
      try { setLines(JSON.parse(savedLines)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (objects.length > 0 || lines.length > 0) {
      localStorage.setItem('soccerBoardObjects', JSON.stringify(objects));
      localStorage.setItem('soccerBoardLines', JSON.stringify(lines));
    } else if (objects.length === 0 && lines.length === 0) {
      localStorage.removeItem('soccerBoardObjects');
      localStorage.removeItem('soccerBoardLines');
    }
  }, [objects, lines]);

  const handleAddObject = (type: ObjType) => {
    console.info('[Board] Adding object:', type);
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
    console.info('[Board] Applying formation:', scheme);
    if (scheme === '4-4-2') {
      const formation442: BoardObject[] = [
        { id: `red-gk-${Date.now()}`, type: 'player-red', x: 300, y: 830 },
        { id: `red-lb-${Date.now()}`, type: 'player-red', x: 100, y: 700 },
        { id: `red-cb1-${Date.now()}`, type: 'player-red', x: 230, y: 730 },
        { id: `red-cb2-${Date.now()}`, type: 'player-red', x: 370, y: 730 },
        { id: `red-rb-${Date.now()}`, type: 'player-red', x: 500, y: 700 },
        { id: `red-lm-${Date.now()}`, type: 'player-red', x: 100, y: 550 },
        { id: `red-cm1-${Date.now()}`, type: 'player-red', x: 250, y: 580 },
        { id: `red-cm2-${Date.now()}`, type: 'player-red', x: 350, y: 580 },
        { id: `red-rm-${Date.now()}`, type: 'player-red', x: 500, y: 550 },
        { id: `red-st1-${Date.now()}`, type: 'player-red', x: 250, y: 450 },
        { id: `red-st2-${Date.now()}`, type: 'player-red', x: 350, y: 450 },
      ];
      const otherObjects = objects.filter(obj => obj.type !== 'player-red');
      setObjects([...otherObjects, ...formation442]);
    }
    setActiveTool('select');
  };

  const handleDragEnd = (e: any, id: string) => {
    setObjects(objects.map(obj => {
      if (obj.id === id) {
        return { ...obj, x: e.target.x(), y: e.target.y() };
      }
      return obj;
    }));
  };

  const handleMouseDown = (e: any) => {
    if (activeTool === 'text') {
      const pos = e.target.getStage().getPointerPosition();
      setPendingTextPos({ x: pos.x, y: pos.y });
      setTextInputValue('');
      setShowTextModal(true);
      return;
    }

    if (activeTool !== 'pen' && activeTool !== 'line' && activeTool !== 'arrow') return;

    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, {
      id: `line-${Date.now()}`,
      type: activeTool as 'free' | 'straight' | 'arrow',
      points: [pos.x, pos.y, pos.x, pos.y],
      color: '#db2777', // pink/red color for drawing
      width: 4
    }]);
  };

  const handleModalSubmit = () => {
    if (textInputValue) {
      console.info('[Board] Adding text:', textInputValue);
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

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || (activeTool !== 'pen' && activeTool !== 'line' && activeTool !== 'arrow')) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];

    if (lastLine.type === 'free' || !lastLine.type) {
      lastLine.points = lastLine.points.concat([point.x, point.y]);
    } else {
      lastLine.points = [lastLine.points[0], lastLine.points[1], point.x, point.y];
    }

    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const clearBoard = () => {
    console.warn('[Board] Clearing board');
    setObjects([]);
    setLines([]);
  };

  const undoLastAction = () => {
    console.info('[Board] Undo last action');
    if ((activeTool === 'pen' || activeTool === 'line' || activeTool === 'arrow') && lines.length > 0) {
      setLines(lines.slice(0, -1));
    } else if (objects.length > 0) {
      setObjects(objects.slice(0, -1));
    }
  };

  const exportImage = () => {
    console.info('[Board] Exporting image');
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'tactics.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Football ball pattern
  const BallPattern = () => (
    <Group>
      <KonvaCircle radius={10} fill="#ffffff" stroke="#000000" strokeWidth={1.5} />
      <KonvaCircle x={0} y={0} radius={3} fill="#000000" />
      <KonvaCircle x={-6} y={-3} radius={2} fill="#000000" />
      <KonvaCircle x={6} y={-3} radius={2} fill="#000000" />
      <KonvaCircle x={0} y={7} radius={2} fill="#000000" />
      <KonvaCircle x={-5} y={4} radius={1.5} fill="#000000" />
      <KonvaCircle x={5} y={4} radius={1.5} fill="#000000" />
    </Group>
  );

  return (
    <div className="app-container">
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
              onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
              placeholder="Enter text here..."
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowTextModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleModalSubmit}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-title">Soccer Tactical Board</div>
        <div className="header-actions">
          <button className="icon-btn" title="Undo" onClick={undoLastAction}><RotateCcw size={20} /></button>
          <button className="icon-btn" title="Clear Board" onClick={clearBoard}><Trash2 size={20} /></button>
          <button className="icon-btn" title="Export Image" onClick={exportImage}><Download size={20} /></button>
        </div>
      </header>

      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
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
                <Minus size={20} />
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
                <BallPattern />
                <span>Ball</span>
              </button>
            </div>
          </div>

          <div className="tool-group">
            <div className="tool-group-label">Formations (Red)</div>
            <button className="formation-btn" onClick={() => handleApplyFormation('4-4-2')}>
              <LayoutGrid size={16} />
              4 - 4 - 2
            </button>
          </div>
        </aside>

        {/* Board Area */}
        <main className="board-container">
          <div className="board-wrapper" style={{ width: PITCH_WIDTH, height: PITCH_HEIGHT }}>
            <Stage
              width={PITCH_WIDTH}
              height={PITCH_HEIGHT}
              ref={stageRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {/* Background */}
                <Rect width={PITCH_WIDTH} height={PITCH_HEIGHT} fill="#ffffff" />

                {/* Pitch Outlines */}
                <Line
                  points={[20, 20, PITCH_WIDTH - 20, 20, PITCH_WIDTH - 20, PITCH_HEIGHT - 20, 20, PITCH_HEIGHT - 20, 20, 20]}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Halfway Line */}
                <Line
                  points={[20, PITCH_HEIGHT / 2, PITCH_WIDTH - 20, PITCH_HEIGHT / 2]}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Center Circle */}
                <KonvaCircle
                  x={PITCH_WIDTH / 2}
                  y={PITCH_HEIGHT / 2}
                  radius={70}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Top Penalty Area */}
                <Rect
                  x={PITCH_WIDTH / 2 - 120}
                  y={20}
                  width={240}
                  height={110}
                  stroke="#000000"
                  strokeWidth={2}
                />
                {/* Top Penalty Arc - Center is Penalty Spot (11m from goal line) */}
                <Arc
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
                <Rect
                  x={PITCH_WIDTH / 2 - 120}
                  y={PITCH_HEIGHT - 130}
                  width={240}
                  height={110}
                  stroke="#000000"
                  strokeWidth={2}
                />
                {/* Bottom Penalty Arc - Center is Penalty Spot */}
                <Arc
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
                <Rect x={PITCH_WIDTH / 2 - 50} y={20} width={100} height={40} stroke="#000000" strokeWidth={2} />
                <Rect x={PITCH_WIDTH / 2 - 50} y={PITCH_HEIGHT - 60} width={100} height={40} stroke="#000000" strokeWidth={2} />
                <Rect x={PITCH_WIDTH / 2 - 35} y={10} width={70} height={10} fill="#000000" />
                <Rect x={PITCH_WIDTH / 2 - 35} y={PITCH_HEIGHT - 20} width={70} height={10} fill="#000000" />

                {/* Drawn Lines */}
                {lines.map((line) => {
                  if (line.type === 'arrow') {
                    return (
                      <Arrow
                        key={line.id}
                        points={line.points}
                        stroke={line.color}
                        fill={line.color}
                        strokeWidth={line.width}
                        pointerLength={10}
                        pointerWidth={10}
                        tension={0}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  }
                  return (
                    <Line
                      key={line.id}
                      points={line.points}
                      stroke={line.color}
                      strokeWidth={line.width}
                      tension={line.type === 'free' || !line.type ? 0.5 : 0}
                      lineCap="round"
                      lineJoin="round"
                    />
                  );
                })}

                {/* Objects */}
                {objects.map((obj) => (
                  <Group
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    draggable={activeTool === 'select'}
                    onDragEnd={(e) => handleDragEnd(e, obj.id)}
                  >
                    {obj.type === 'text' ? (
                      <Text
                        text={obj.text}
                        fontSize={20}
                        fill="#000000"
                        fontFamily="Arial"
                        fontStyle="bold"
                        padding={4}
                        offsetX={10}
                      />
                    ) : obj.type.startsWith('player') ? (
                      <KonvaCircle
                        radius={15}
                        fill={obj.type === 'player-red' ? '#ef4444' : '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.3)"
                        shadowBlur={4}
                        shadowOffset={{ x: 0, y: 2 }}
                      />
                    ) : (
                      <BallPattern />
                    )}
                  </Group>
                ))}
              </Layer>
            </Stage>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
