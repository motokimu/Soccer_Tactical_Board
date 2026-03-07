import { useState, useRef, useEffect } from 'react';
import './App.css';
import {
  Download, RotateCcw, Trash2,
  MousePointer2, Pen, Type,
  User, Circle as CircleIcon,
  Minus, ArrowRight
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
      const textLine = prompt('Enter text:');
      if (textLine) {
        console.info('[Board] Adding text:', textLine);
        setObjects([...objects, {
          id: `text-${Date.now()}`,
          type: 'text',
          x: pos.x,
          y: pos.y,
          text: textLine
        }]);
      }
      setActiveTool('select');
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
    setLines(lines.concat());
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

  return (
    <div className="app-container">
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
            <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select / Move">
              <MousePointer2 size={24} />
            </button>
            <button className={`tool-btn ${activeTool === 'pen' ? 'active' : ''}`} onClick={() => setActiveTool('pen')} title="Draw Freehand">
              <Pen size={24} />
            </button>
            <button className={`tool-btn ${activeTool === 'line' ? 'active' : ''}`} onClick={() => setActiveTool('line')} title="Draw Straight Line">
              <Minus size={24} />
            </button>
            <button className={`tool-btn ${activeTool === 'arrow' ? 'active' : ''}`} onClick={() => setActiveTool('arrow')} title="Draw Arrow">
              <ArrowRight size={24} />
            </button>
            <button className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Add Text">
              <Type size={24} />
            </button>
          </div>
          <div className="tool-group">
            <button className="tool-btn" title="Add Player Red" onClick={() => handleAddObject('player-red')}>
              <User size={24} color="#ef4444" />
            </button>
            <button className="tool-btn" title="Add Player Blue" onClick={() => handleAddObject('player-blue')}>
              <User size={24} color="#3b82f6" />
            </button>
            <button className="tool-btn" title="Add Ball" onClick={() => handleAddObject('ball')}>
              <CircleIcon size={24} />
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
                {/* Top Penalty Arc */}
                <Arc
                  x={PITCH_WIDTH / 2}
                  y={130}
                  innerRadius={60}
                  outerRadius={60}
                  angle={100}
                  rotation={40}
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
                {/* Bottom Penalty Arc */}
                <Arc
                  x={PITCH_WIDTH / 2}
                  y={PITCH_HEIGHT - 130}
                  innerRadius={60}
                  outerRadius={60}
                  angle={100}
                  rotation={220}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Top Goal Area */}
                <Rect
                  x={PITCH_WIDTH / 2 - 50}
                  y={20}
                  width={100}
                  height={40}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Bottom Goal Area */}
                <Rect
                  x={PITCH_WIDTH / 2 - 50}
                  y={PITCH_HEIGHT - 60}
                  width={100}
                  height={40}
                  stroke="#000000"
                  strokeWidth={2}
                />

                {/* Goals */}
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
                      globalCompositeOperation="source-over"
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
                      />
                    ) : obj.type.startsWith('player') ? (
                      <KonvaCircle
                        radius={14}
                        fill={obj.type === 'player-red' ? '#ef4444' : '#3b82f6'}
                        stroke="#ffffff"
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.3)"
                        shadowBlur={4}
                        shadowOffset={{ x: 0, y: 2 }}
                      />
                    ) : (
                      <KonvaCircle
                        radius={8}
                        fill="#ffffff"
                        stroke="#000000"
                        strokeWidth={2}
                        shadowColor="rgba(0,0,0,0.3)"
                        shadowBlur={2}
                        shadowOffset={{ x: 0, y: 1 }}
                      />
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
