
import React, { useState, useMemo } from 'react';
import { AppState, Department, Employee, ExpenseGroup, ExpenseCategory, IncomeService, User, UserRole } from '../types';

interface SettingsProps {
  state: AppState;
  onUpdate: (newState: Partial<AppState>) => void;
  onDelete: (name: string, onConfirm: () => void) => void;
}

export const Settings: React.FC<SettingsProps> = ({ state, onUpdate, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'departments' | 'expenses' | 'income' | 'users' | 'profile'>('departments');

  const isAdmin = state.currentUser?.role === 'admin';

  const updateItem = <T extends { id: string }>(key: keyof AppState, updatedItem: T) => {
    onUpdate({ [key]: (state[key] as any[]).map((item: any) => item.id === updatedItem.id ? updatedItem : item) });
  };

  const addItem = <T,>(key: keyof AppState, item: T) => {
    onUpdate({ [key]: [...(state[key] as any[]), item] });
  };

  const removeItem = (key: keyof AppState, id: string) => {
    onUpdate({ [key]: (state[key] as any[]).filter((item: any) => item.id !== id) });
  };

  const sidebarTabs = [
    { id: 'profile', icon: 'fa-user-circle', label: 'My Profile', show: true },
    { id: 'departments', icon: 'fa-sitemap', label: 'Departments', show: isAdmin },
    { id: 'employees', icon: 'fa-users', label: 'Employees', show: isAdmin },
    { id: 'expenses', icon: 'fa-tags', label: 'Expense Groups', show: isAdmin },
    { id: 'income', icon: 'fa-hand-holding-dollar', label: 'Income Services', show: isAdmin },
    { id: 'users', icon: 'fa-user-shield', label: 'Access Control', show: isAdmin },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col md:flex-row overflow-hidden animate-fadeIn">
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2 text-center md:text-left">Configuration</h3>
        <nav className="space-y-1">
          {sidebarTabs.filter(t => t.show).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <i className={`fas ${tab.icon} w-5`}></i>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-y-auto max-h-[700px]">
        {activeTab === 'profile' && (
          <ProfileManager 
            user={state.currentUser!} 
            onUpdate={(updated) => {
              onUpdate({ 
                currentUser: updated,
                users: state.users.map(u => u.id === updated.id ? updated : u)
              });
            }} 
          />
        )}
        {activeTab === 'departments' && isAdmin && (
          <DepartmentManager 
            items={state.departments} 
            onAdd={(name) => addItem('departments', { id: `dept-${Date.now()}`, name })}
            onUpdate={(item) => updateItem('departments', item)}
            onRemove={(dept) => onDelete(dept.name, () => removeItem('departments', dept.id))}
          />
        )}
        {activeTab === 'employees' && isAdmin && (
          <EmployeeManager 
            items={state.employees} 
            departments={state.departments}
            onAdd={(name, empNo, deptId, salary, nationality, active) => 
              addItem('employees', { id: `emp-${Date.now()}`, name, employeeNumber: empNo, departmentId: deptId, salary, nationality, isActive: active })}
            onUpdate={(item) => updateItem('employees', item)}
            onRemove={(emp) => onDelete(emp.name, () => removeItem('employees', emp.id))}
          />
        )}
        {activeTab === 'expenses' && isAdmin && (
          <ExpenseStructureManager 
            groups={state.expenseGroups}
            categories={state.expenseCategories}
            onAddGroup={(name, isCOGS) => addItem('expenseGroups', { id: `grp-${Date.now()}`, name, isCOGS })}
            onUpdateGroup={(item) => updateItem('expenseGroups', item)}
            onAddCategory={(groupId, name) => addItem('expenseCategories', { id: `cat-${Date.now()}`, groupId, name })}
            onUpdateCategory={(item) => updateItem('expenseCategories', item)}
            onRemoveGroup={(group) => onDelete(group.name, () => {
              onUpdate({
                expenseGroups: state.expenseGroups.filter(g => g.id !== group.id),
                expenseCategories: state.expenseCategories.filter(c => c.groupId !== group.id)
              });
            })}
            onRemoveCategory={(cat) => onDelete(cat.name, () => removeItem('expenseCategories', cat.id))}
          />
        )}
        {activeTab === 'income' && isAdmin && (
          <IncomeServiceManager 
            items={state.incomeServices}
            onAdd={(name) => addItem('incomeServices', { id: `svc-${Date.now()}`, name })}
            onUpdate={(item) => updateItem('incomeServices', item)}
            onRemove={(svc) => onDelete(svc.name, () => removeItem('incomeServices', svc.id))}
          />
        )}
        {activeTab === 'users' && isAdmin && (
          <UserManager 
            users={state.users}
            onAdd={(name, email, password, role) => addItem('users', { id: `user-${Date.now()}`, name, email, password, role })}
            onUpdate={(user) => updateItem('users', user)}
            onRemove={(user) => onDelete(user.name, () => removeItem('users', user.id))}
          />
        )}
      </div>
    </div>
  );
};

const ProfileManager: React.FC<{ user: User, onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [form, setForm] = useState({ ...user, password: user.password || '' });
  const [message, setMessage] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <h4 className="text-xl font-bold text-slate-800">My Profile</h4>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm bg-slate-50 cursor-not-allowed" disabled />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Login Password</label>
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-xl px-4 py-2.5 text-sm" />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">Update Profile</button>
        {message && <p className="text-emerald-600 text-sm font-bold animate-fadeIn">{message}</p>}
      </form>
    </div>
  );
};

const UserManager: React.FC<{ users: User[], onAdd: (n: string, e: string, p: string, r: UserRole) => void, onUpdate: (u: User) => void, onRemove: (u: User) => void }> = ({ users, onAdd, onUpdate, onRemove }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' as UserRole });
  
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(form.name && form.email && form.password) {
      onAdd(form.name, form.email, form.password, form.role);
      setForm({ name: '', email: '', password: '', role: 'viewer' });
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Access Control</h4>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required />
        <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required />
        <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required />
        <select value={form.role} onChange={e => setForm({...form, role: e.target.value as any})} className="border rounded-lg px-3 py-2 text-sm">
          <option value="viewer">Viewer (Read Only)</option>
          <option value="editor">Editor (Modify Entries)</option>
        </select>
        <button type="submit" className="md:col-span-4 bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest">Create New Account</button>
      </form>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-700">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                    u.role === 'editor' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== 'admin' && (
                    <button onClick={() => onRemove(u)} className="text-rose-400 hover:text-rose-600 p-2"><i className="fas fa-trash-can"></i></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DepartmentManager: React.FC<{ items: Department[], onAdd: (n: string) => void, onUpdate: (d: Department) => void, onRemove: (d: Department) => void }> = ({ items, onAdd, onUpdate, onRemove }) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(name) { onAdd(name); setName(''); }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Departments</h4>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" placeholder="Department Name" value={name} onChange={e => setName(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Add</button>
      </form>
      <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden shadow-sm">
        {items.map(dept => (
          <li key={dept.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
            {editingId === dept.id ? (
              <input 
                autoFocus
                className="flex-1 border border-slate-200 rounded px-2 py-1 mr-2"
                value={dept.name}
                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                onChange={(e) => onUpdate({ ...dept, name: e.target.value })}
                onBlur={() => setEditingId(null)}
              />
            ) : (
              <span className="font-medium text-slate-700">{dept.name}</span>
            )}
            <div className="flex items-center gap-1">
              <button onClick={() => setEditingId(editingId === dept.id ? null : dept.id)} className="text-slate-400 hover:text-indigo-600 p-2 transition-colors">
                <i className={`fas ${editingId === dept.id ? 'fa-check text-emerald-500' : 'fa-edit'}`}></i>
              </button>
              <button onClick={() => onRemove(dept)} className="text-rose-400 hover:text-rose-600 p-2 transition-colors"><i className="fas fa-trash-can"></i></button>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="p-8 text-center text-slate-400 italic">No departments added yet.</li>}
      </ul>
    </div>
  );
};

const EmployeeManager: React.FC<{ 
  items: Employee[], 
  departments: Department[], 
  onAdd: (n: string, eno: string, d: string, s: number, nat: string, act: boolean) => void, 
  onUpdate: (e: Employee) => void, 
  onRemove: (emp: Employee) => void 
}> = ({ items, departments, onAdd, onUpdate, onRemove }) => {
  const [form, setForm] = useState({ name: '', employeeNumber: '', deptId: '', salary: '', nationality: '', isActive: true });
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter(emp => {
      const deptName = departments.find(d => d.id === emp.departmentId)?.name || '';
      return emp.name.toLowerCase().includes(search.toLowerCase()) || 
             emp.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
             deptName.toLowerCase().includes(search.toLowerCase()) ||
             emp.nationality.toLowerCase().includes(search.toLowerCase());
    });
  }, [items, search, departments]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(form.name && form.deptId && form.employeeNumber) { 
      onAdd(form.name, form.employeeNumber, form.deptId, Number(form.salary), form.nationality, form.isActive); 
      setForm({name:'', employeeNumber: '', deptId:'', salary:'', nationality:'', isActive: true}); 
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Employees</h4>
      
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required/>
        <input type="text" placeholder="Employee #" value={form.employeeNumber} onChange={e => setForm({...form, employeeNumber: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required/>
        <select value={form.deptId} onChange={e => setForm({...form, deptId: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required>
          <option value="">Select Department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="text" placeholder="Nationality" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" required/>
        <div className="relative">
          <input type="number" placeholder="Salary" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-12 text-sm" required/>
          <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">SAR</span>
        </div>
        <div className="flex items-center gap-2 px-3">
          <input type="checkbox" id="is_active_new" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded text-indigo-600"/>
          <label htmlFor="is_active_new" className="text-sm text-slate-600">Active Status</label>
        </div>
        <button type="submit" className="lg:col-span-3 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm mt-2 font-bold text-xs uppercase tracking-widest">Add Employee</button>
      </form>

      <div className="relative">
        <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
        <input 
          type="text" 
          placeholder="Search by name, #, department..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase border-b border-slate-100">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Dept</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Salary</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(emp => (
              <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs">
                   {editingId === emp.id ? (
                    <input className="border rounded px-2 py-1 w-full" value={emp.employeeNumber} onChange={(e) => onUpdate({...emp, employeeNumber: e.target.value})} onKeyDown={e => e.key === 'Enter' && setEditingId(null)}/>
                  ) : emp.employeeNumber}
                </td>
                <td className="py-3 px-4">
                  {editingId === emp.id ? (
                    <input autoFocus className="border rounded px-2 py-1 w-full" value={emp.name} onChange={(e) => onUpdate({...emp, name: e.target.value})} onKeyDown={e => e.key === 'Enter' && setEditingId(null)}/>
                  ) : <span className="font-medium text-slate-700">{emp.name}</span>}
                </td>
                <td className="py-3 px-4">
                  {editingId === emp.id ? (
                    <select className="border rounded px-2 py-1 w-full text-sm" value={emp.departmentId} onChange={(e) => onUpdate({...emp, departmentId: e.target.value})}>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  ) : <span className="text-slate-500 text-sm">{departments.find(d => d.id === emp.departmentId)?.name || 'Unknown'}</span>}
                </td>
                <td className="py-3 px-4">
                  {editingId === emp.id ? (
                    <input type="checkbox" checked={emp.isActive} onChange={(e) => onUpdate({...emp, isActive: e.target.checked})} />
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${emp.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {editingId === emp.id ? (
                    <input type="number" className="border rounded px-2 py-1 w-24 ml-auto" value={emp.salary} onChange={(e) => onUpdate({...emp, salary: Number(e.target.value)})} onKeyDown={e => e.key === 'Enter' && setEditingId(null)}/>
                  ) : <span className="font-bold text-indigo-600">{emp.salary.toLocaleString()} <span className="text-[10px] text-slate-400">SAR</span></span>}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                   <button onClick={() => setEditingId(editingId === emp.id ? null : emp.id)} className="text-slate-400 hover:text-indigo-600 p-1 mr-2 transition-colors">
                    <i className={`fas ${editingId === emp.id ? 'fa-check text-emerald-500' : 'fa-edit'}`}></i>
                  </button>
                  <button onClick={() => onRemove(emp)} className="text-rose-400 hover:text-rose-600 p-1 transition-colors"><i className="fas fa-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ExpenseStructureManager: React.FC<{ 
  groups: ExpenseGroup[], 
  categories: ExpenseCategory[], 
  onAddGroup: (n: string, c: boolean) => void, 
  onUpdateGroup: (g: ExpenseGroup) => void,
  onAddCategory: (gid: string, n: string) => void, 
  onUpdateCategory: (c: ExpenseCategory) => void,
  onRemoveGroup: (group: ExpenseGroup) => void, 
  onRemoveCategory: (cat: ExpenseCategory) => void 
}> = ({ groups, categories, onAddGroup, onUpdateGroup, onAddCategory, onUpdateCategory, onRemoveGroup, onRemoveCategory }) => {
  const [gName, setGName] = useState('');
  const [isCOGS, setIsCOGS] = useState(false);
  const [cNames, setCNames] = useState<Record<string, string>>({});
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if(gName) { onAddGroup(gName, isCOGS); setGName(''); setIsCOGS(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-xl font-bold text-slate-800 mb-4">Expense Groups</h4>
        <form onSubmit={handleAddGroup} className="flex flex-wrap gap-2 items-center bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
          <input type="text" placeholder="Group Name" value={gName} onChange={e => setGName(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-100"/>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer font-bold uppercase text-[10px]">
            <input type="checkbox" checked={isCOGS} onChange={e => setIsCOGS(e.target.checked)} className="rounded text-indigo-600"/>
            COGS Category
          </label>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold text-[10px] uppercase">Add Group</button>
        </form>
        <div className="grid grid-cols-1 gap-4">
          {groups.map(group => (
            <div key={group.id} className="border border-slate-200 rounded-xl p-4 shadow-sm bg-white hover:border-slate-300 transition-all">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 flex-1">
                  {editingGroupId === group.id ? (
                    <input autoFocus className="border rounded px-2 py-1 text-sm font-bold w-40" value={group.name} onChange={(e) => onUpdateGroup({...group, name: e.target.value})} onBlur={() => setEditingGroupId(null)} onKeyDown={e => e.key === 'Enter' && setEditingGroupId(null)}/>
                  ) : <h5 className="font-bold text-slate-800">{group.name}</h5>}
                  {group.isCOGS && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">COGS</span>}
                  <button onClick={() => setEditingGroupId(editingGroupId === group.id ? null : group.id)} className="text-slate-300 hover:text-indigo-600 text-xs ml-2 transition-colors"><i className={`fas ${editingGroupId === group.id ? 'fa-check text-emerald-500' : 'fa-edit'}`}></i></button>
                </div>
                <button onClick={() => onRemoveGroup(group)} className="text-rose-400 text-xs font-semibold hover:text-rose-600 transition-colors uppercase tracking-widest">Delete Group</button>
              </div>
              <div className="pl-4 border-l-2 border-slate-100 space-y-3">
                <form onSubmit={(e) => { e.preventDefault(); if(cNames[group.id]) { onAddCategory(group.id, cNames[group.id]); setCNames({...cNames, [group.id]: ''}); } }} className="flex gap-2">
                  <input 
                    type="text" placeholder="Add Category..." value={cNames[group.id] || ''} 
                    onChange={e => setCNames({...cNames, [group.id]: e.target.value})}
                    className="flex-1 border border-slate-100 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <button type="submit" className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors uppercase">ADD</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.groupId === group.id).map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 group hover:bg-slate-100 transition-all border border-slate-200">
                      {editingCatId === cat.id ? (
                        <input autoFocus className="bg-transparent border-none outline-none w-24" value={cat.name} onChange={(e) => onUpdateCategory({...cat, name: e.target.value})} onBlur={() => setEditingCatId(null)} onKeyDown={e => e.key === 'Enter' && setEditingCatId(null)}/>
                      ) : <span className="cursor-pointer" onDoubleClick={() => setEditingCatId(cat.id)}>{cat.name}</span>}
                      <button onClick={() => setEditingCatId(editingCatId === cat.id ? null : cat.id)} className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"><i className={`fas ${editingCatId === cat.id ? 'fa-check' : 'fa-edit'}`}></i></button>
                      <button onClick={() => onRemoveCategory(cat)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const IncomeServiceManager: React.FC<{ items: IncomeService[], onAdd: (n: string) => void, onUpdate: (s: IncomeService) => void, onRemove: (svc: IncomeService) => void }> = ({ items, onAdd, onUpdate, onRemove }) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if(name) { onAdd(name); setName(''); }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-bold text-slate-800">Income Services</h4>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" placeholder="Service Name" value={name} onChange={e => setName(e.target.value)}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-100 text-sm"
        />
        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-bold text-xs uppercase tracking-widest">Add Service</button>
      </form>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(svc => (
          <li key={svc.id} className="flex justify-between items-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 hover:shadow-sm transition-all">
            {editingId === svc.id ? (
              <input autoFocus className="flex-1 bg-white border rounded px-2 py-1 mr-2 text-sm" value={svc.name} onChange={(e) => onUpdate({...svc, name: e.target.value})} onBlur={() => setEditingId(null)} onKeyDown={e => e.key === 'Enter' && setEditingId(null)}/>
            ) : <span className="font-semibold text-emerald-900">{svc.name}</span>}
            <div className="flex items-center gap-1">
              <button onClick={() => setEditingId(editingId === svc.id ? null : svc.id)} className="text-emerald-400 hover:text-indigo-600 p-2 transition-colors">
                <i className={`fas ${editingId === svc.id ? 'fa-check' : 'fa-edit'}`}></i>
              </button>
              <button onClick={() => onRemove(svc)} className="text-emerald-400 hover:text-rose-600 transition-colors p-2"><i className="fas fa-trash-can"></i></button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
