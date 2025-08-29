import React, { useState } from 'react';
import { UserPlus, Send, Trash2 } from 'lucide-react';
import { mockUsers } from '../data/mockData';
import { StatusBadge } from '../components/StatusBadge';
import { User } from '../types';
import {API_BASE} from "../lib/api";

export function UserManagementPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Project Manager',
    projectCodes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Inviting user: ${formData.fullName} (${formData.email})`);
    setFormData({
      fullName: '',
      email: '',
      role: 'Project Manager',
      projectCodes: ''
    });
  };

  const handleResendInvite = (user: User) => {
    alert(`Resending invite to: ${user.name}`);
  };

  const handleRemoveUser = (user: User) => {
    alert(`Removing user: ${user.name}`);
  };

  const activeUsers = mockUsers.filter(user => user.status === 'active').length;
  const invitedUsers = mockUsers.filter(user => user.status === 'invited').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage team members and their access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{mockUsers.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{invitedUsers}</div>
          <div className="text-sm text-gray-600">Invited</div>
        </div>
      </div>

      {/* Invite User Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus size={20} />
          Invite New User
        </h2>
        
        <form onSubmit={handleInviteUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Project Manager">Project Manager</option>
              <option value="Monitoring Team">Monitoring Team</option>
              <option value="Charity Manager">Charity Manager</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="projectCodes" className="block text-sm font-medium text-gray-700 mb-1">
              Project Codes (Optional)
            </label>
            <input
              type="text"
              id="projectCodes"
              name="projectCodes"
              value={formData.projectCodes}
              onChange={handleInputChange}
              placeholder="e.g., WFP-2024-001, UNICEF-2024-002"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated project codes for access restriction</p>
          </div>
          
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Send size={16} />
            Send Invite
          </button>
        </form>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={user.role.toLowerCase().replace(' ', '_')} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.projectCodes ? user.projectCodes.length : 'All'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {user.status === 'invited' && (
                      <button
                        onClick={() => handleResendInvite(user)}
                        className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                      >
                        <Send size={14} />
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveUser(user)}
                      className="text-red-600 hover:text-red-900 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}