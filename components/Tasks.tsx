
import React, { useState, useMemo } from 'react';
import { AppState, Task, TaskStatus } from '../types';

interface TasksProps {
  state: AppState;
  onUpdate: (newState: Partial<AppState>) => void;
  onDelete: (name: string, onConfirm: () => void) => void;
}

export const Tasks: React.FC<TasksProps> = ({ state, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ address: '', notes: '' });
  const [newForm, setNewForm] = useState({ address: '', notes: '' });
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const filteredTasks = useMemo(() => {
    let tasks = [...state.tasks];
    if (filter === 'in-progress') tasks = tasks.filter(t => t.status === 'in-progress' || !t.status);
    if (filter === 'completed') tasks = tasks.filter(t => t.status === 'completed');
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.tasks, filter]);

  const selectedTask = useMemo(() => 
    state.tasks.find(t => t.id === selectedTaskId), 
    [state.tasks, selectedTaskId]
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.address) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      address: newForm.address,
      notes: newForm.notes,
      status: 'in-progress',
      createdAt: new Date().toISOString()
    };

    onUpdate({ tasks: [newTask, ...state.tasks] });
    setNewForm({ address: '', notes: '' });
    setShowNewTaskForm(false);
    setSelectedTaskId(newTask.id);
  };

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    const updatedTasks = state.tasks.map(t => 
      t.id === selectedTaskId 
        ? { ...t, address: editForm.address, notes: editForm.notes } 
        : t
    );

    onUpdate({ tasks: updatedTasks });
    setIsEditing(false);
  };

  const toggleStatus = (taskId: string) => {
    const updatedTasks = state.tasks.map(t => {
      if (t.id === taskId) {
        const newStatus: TaskStatus = t.status === 'completed' ? 'in-progress' : 'completed';
        return { ...t, status: newStatus };
      }
      return t;
    });
    onUpdate({ tasks: updatedTasks });
  };

  const removeTask = (id: string) => {
    const task = state.tasks.find(t => t.id === id);
    onDelete(task?.address || 'Task', () => {
      onUpdate({ tasks: state.tasks.filter(t => t.id !== id) });
      if (selectedTaskId === id) setSelectedTaskId(null);
    });
  };

  const startEditing = () => {
    if (selectedTask) {
      setEditForm({ address: selectedTask.address, notes: selectedTask.notes });
      setIsEditing(true);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[700px] bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
      {/* Sidebar - Task List */}
      <div className="w-full md:w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-indigo-900 text-xs uppercase tracking-widest">Inbox</h3>
            <button 
              onClick={() => { setShowNewTaskForm(true); setSelectedTaskId(null); }}
              className="bg-indigo-600 text-white h-7 w-7 rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['all', 'in-progress', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-tighter rounded-lg transition-all ${
                  filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTasks.map(task => (
            <button
              key={task.id}
              onClick={() => { setSelectedTaskId(task.id); setIsEditing(false); setShowNewTaskForm(false); }}
              className={`w-full text-left p-4 border-b border-slate-50 transition-all relative hover:bg-white ${
                selectedTaskId === task.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  task.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {task.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
                <span className="text-[9px] text-slate-400">{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className={`text-sm font-bold truncate ${selectedTaskId === task.id ? 'text-indigo-900' : 'text-slate-700'} ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                {task.address}
              </h4>
              <p className="text-xs text-slate-400 truncate mt-1">{task.notes || 'No additional notes'}</p>
            </button>
          ))}
          {filteredTasks.length === 0 && (
            <div className="p-12 text-center">
              <i className="fas fa-tray text-slate-200 text-3xl mb-3"></i>
              <p className="text-xs font-bold text-slate-300 uppercase">Empty Folder</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-white overflow-y-auto">
        {showNewTaskForm ? (
          <div className="p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">New Assignment</h3>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Subject / Address</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newForm.address} 
                  onChange={e => setNewForm({...newForm, address: e.target.value})}
                  className="w-full border-b-2 border-slate-100 focus:border-indigo-600 px-0 py-3 text-lg font-bold outline-none transition-all placeholder:text-slate-200"
                  placeholder="Task title..."
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Notes</label>
                <textarea 
                  value={newForm.notes} 
                  onChange={e => setNewForm({...newForm, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[200px]"
                  placeholder="Describe the task in detail..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowNewTaskForm(false)}
                  className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        ) : selectedTask ? (
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleStatus(selectedTask.id)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedTask.status === 'completed' 
                      ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <i className={`fas ${selectedTask.status === 'completed' ? 'fa-rotate-left' : 'fa-check'} mr-2`}></i>
                  {selectedTask.status === 'completed' ? 'Mark In Progress' : 'Mark Completed'}
                </button>
                <button 
                  onClick={startEditing}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  <i className="fas fa-edit mr-2"></i> Edit
                </button>
              </div>
              <button 
                onClick={() => removeTask(selectedTask.id)}
                className="text-slate-300 hover:text-rose-600 transition-colors"
              >
                <i className="fas fa-trash-can"></i>
              </button>
            </div>

            <div className="p-8 flex-1">
              {isEditing ? (
                <form onSubmit={handleUpdateTask} className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Subject</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={editForm.address} 
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                      className="w-full border-b-2 border-slate-100 focus:border-indigo-600 px-0 py-3 text-lg font-bold outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Notes</label>
                    <textarea 
                      value={editForm.notes} 
                      onChange={e => setEditForm({...editForm, notes: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[200px]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit" 
                      className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="max-w-2xl">
                  <div className="mb-8">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2 block">
                      Task Subject
                    </span>
                    <h2 className={`text-3xl font-black text-slate-800 leading-tight ${selectedTask.status === 'completed' ? 'line-through opacity-40' : ''}`}>
                      {selectedTask.address}
                    </h2>
                  </div>
                  <div className="mb-8 flex items-center gap-6">
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Created On</span>
                      <span className="text-sm text-slate-600 font-bold">{new Date(selectedTask.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-100"></div>
                    <div>
                      <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</span>
                      <span className={`text-sm font-black uppercase ${selectedTask.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {selectedTask.status === 'completed' ? 'Completed' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="prose prose-slate max-w-none">
                    <span className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em]">Context & Notes</span>
                    <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 text-slate-600 leading-relaxed whitespace-pre-wrap italic shadow-inner">
                      {selectedTask.notes || 'No notes attached to this task.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-300">
            <div className="bg-slate-50 h-24 w-24 rounded-full flex items-center justify-center mb-6">
              <i className="fas fa-envelope-open text-4xl"></i>
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Select a task</h3>
            <p className="text-xs mt-2 italic">Select a task from the list to view its details or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
