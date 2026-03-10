import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    ChevronDown,
    Copy,
    Trash,
    User,
    Pen
} from 'lucide-react';
import '../App.css';

interface Board {
    id: string;
    name: string;
    data: string;
    createdAt: string;
    updatedAt: string;
}

export function Dashboard() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt'>('updatedAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [userName, setUserName] = useState<string | null>(localStorage.getItem('soccerBoardUserName'));
    const [showUserModal, setShowUserModal] = useState(false);
    const [tempUserName, setTempUserName] = useState('');
    const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(5);

    const navigate = useNavigate();

    const fetchBoards = async () => {
        try {
            const response = await fetch('/api/boards');
            if (response.ok) {
                const data = await response.json();
                setBoards(data);
            }
        } catch (e) {
            console.error('Failed to fetch boards:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    const checkUserAndNavigate = (targetId: string | null) => {
        if (!userName) {
            // Use empty string to represent "New Board" in pendingNavigate if null
            setPendingNavigate(targetId === null ? "" : targetId);
            setShowUserModal(true);
            return;
        }
        if (targetId) {
            navigate(`/editor/${targetId}`);
        } else {
            createBoard();
        }
    };

    const createBoard = async () => {
        const name = `untitled ${new Date().toLocaleDateString()}`;
        const initialData = { objects: [], lines: [] };

        try {
            const response = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: initialData }),
            });

            if (response.ok) {
                const newBoard = await response.json();
                navigate(`/editor/${newBoard.id}`);
            }
        } catch (e) {
            console.error('Failed to create board:', e);
        }
    };

    const handleCreateBoard = () => {
        checkUserAndNavigate(null);
    };

    const handleEditBoard = (id: string) => {
        checkUserAndNavigate(id);
    };

    const handleUserModalSubmit = () => {
        if (tempUserName.trim()) {
            const name = tempUserName.trim();
            setUserName(name);
            localStorage.setItem('soccerBoardUserName', name);
            setShowUserModal(false);

            // If we have a pending navigate, it means we came from a board action
            if (pendingNavigate !== undefined && pendingNavigate !== null) {
                if (pendingNavigate === "") { // New Board case
                    createBoard();
                } else {
                    navigate(`/editor/${pendingNavigate}`);
                }
                setPendingNavigate(null);
            }
            // If pendingNavigate is explicitly null (not undefined), it means we just clicked "New Board" 
            // but the state might be tricky. Let's refine checkUserAndNavigate to use a specific flag or distinguish.
        }
    };

    const handleCancelModal = () => {
        setShowUserModal(false);
        setPendingNavigate(null);
    };


    const handleDeleteBoard = async (id: string) => {
        if (!confirm('Are you sure you want to delete this board?')) return;

        try {
            const response = await fetch(`/api/boards?id=${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setBoards(boards.filter(b => b.id !== id));
            }
        } catch (e) {
            console.error('Failed to delete board:', e);
        }
    };

    const handleDuplicateBoard = async (board: Board) => {
        const name = `${board.name} (copy)`;
        const data = typeof board.data === 'string' ? JSON.parse(board.data) : board.data;

        try {
            const response = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data }),
            });

            if (response.ok) {
                const newBoard = await response.json();
                setBoards([...boards, newBoard]);
            }
        } catch (e) {
            console.error('Failed to duplicate board:', e);
        }
    };

    const filteredBoards = boards
        .filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const dateA = new Date(a[sortBy]).getTime();
            const dateB = new Date(b[sortBy]).getTime();
            return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
        });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).replace(/\//g, '-');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="logo-section">
                    <h1 className="logo-text">Soccer Tactical Board</h1>
                </div>
                <div className="header-right-actions">
                    {userName && (
                        <button className="user-profile-btn" onClick={() => { setTempUserName(userName); setShowUserModal(true); }} title="Edit Name">
                            <div className="user-avatar">
                                <User size={20} />
                            </div>
                            <div className="user-details">
                                <span className="user-label">Username</span>
                                <span className="user-name-display">{userName}</span>
                            </div>
                        </button>
                    )}
                    <button className="create-btn" onClick={handleCreateBoard}>
                        <div className="create-icon">
                            <Plus size={32} color="white" />
                        </div>
                        <span>新規作成</span>
                    </button>
                </div>
            </header>

            <div className="dashboard-controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search boards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="sort-controls">
                    <div className="sort-select-wrapper">
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                            <option value="updatedAt">更新日時</option>
                            <option value="createdAt">作成日時</option>
                        </select>
                        <ChevronDown size={16} />
                    </div>
                    <button className="sort-dir-btn" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
                        {sortDir === 'desc' ? '↓' : '↑'}
                    </button>
                </div>
            </div>

            <main className="boards-list">
                {loading ? (
                    <div className="loading-state">Loading your boards...</div>
                ) : filteredBoards.length === 0 ? (
                    <div className="empty-state">
                        <p>ボードが見つかりません。新しいボードを作成しましょう！</p>
                    </div>
                ) : (
                    <>
                        {filteredBoards.slice(0, visibleCount).map(board => (
                            <div key={board.id} className="board-card">
                                <div className="board-card-info">
                                    <div className="board-card-meta">
                                        <span>作成日時 {formatDate(board.createdAt)}</span>
                                        <span>更新日時 {formatDate(board.updatedAt)}</span>
                                    </div>
                                    <h3 className="board-card-name">{board.name}</h3>
                                </div>
                                <div className="board-card-actions">
                                    <div className="board-actions-menu">
                                        <button className="icon-btn-small" onClick={() => handleEditBoard(board.id)} title="編集">
                                            <Pen size={28} />
                                        </button>
                                        <button className="icon-btn-small" onClick={() => handleDuplicateBoard(board)} title="複製">
                                            <Copy size={28} />
                                        </button>
                                        <button className="icon-btn-small" onClick={() => handleDeleteBoard(board.id)} title="削除">
                                            <Trash size={28} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredBoards.length > visibleCount && (
                            <div className="show-more-container">
                                <button
                                    className="show-more-btn"
                                    onClick={() => setVisibleCount(prev => prev + 5)}
                                >
                                    Show more...
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            {showUserModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Set Your Name</h3>
                        <p style={{ color: '#aaa', marginBottom: '20px' }}>Enter a name to use for collaboration.</p>
                        <input
                            type="text"
                            autoFocus
                            value={tempUserName}
                            onChange={(e) => setTempUserName(e.target.value)}
                            placeholder="Your Name"
                        />
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={handleCancelModal}>
                                Cancel
                            </button>
                            <button className="modal-btn primary" onClick={handleUserModalSubmit} style={{ flex: 1 }}>
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
