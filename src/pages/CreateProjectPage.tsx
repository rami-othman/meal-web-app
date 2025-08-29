import React, { useState } from 'react';
import { Save, ArrowRight } from 'lucide-react';
import {API_BASE} from "../lib/api";

export function CreateProjectPage() {
  const [formData, setFormData] = useState({
    projectName: '',
    projectCode: '',
    donor: '',
    implementingOrgs: '',
    sites: '',
    country: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    primaryManager: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = () => {
    alert('Project saved as draft');
  };

  const handleNext = () => {
    alert('Proceeding to next step');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
        <p className="text-gray-600 mt-1">Set up a new project with basic information</p>
      </div>

      <form className="bg-white p-8 rounded-lg border border-gray-200 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <label htmlFor="projectCode" className="block text-sm font-medium text-gray-700 mb-1">
                Project Code *
              </label>
              <input
                type="text"
                id="projectCode"
                name="projectCode"
                value={formData.projectCode}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., WFP-2024-001"
              />
            </div>
            
      
            
            <div>
            
            </div>
          </div>
        </div>

        {/* Organizations and Sites */}
        <div>
          <div className="space-y-4">
       
            
            <div>
              <label htmlFor="sites" className="block text-sm font-medium text-gray-700 mb-1">
                Sites
              </label>
              <input
                type="text"
                id="sites"
                name="sites"
                value={formData.sites}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter site locations (comma-separated)"
              />
            </div>
          </div>
        </div>

        {/* Timeline and Management */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline & Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
         <select
  id="status"
  name="status"
  value={formData.status}
  onChange={handleInputChange}
  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
>
  <option value="1">Planning</option>
  <option value="2">Active</option>
  <option value="3">OnHold</option>
  <option value="4">Completed</option>
  <option value="5">Cancelled</option>
</select>

            </div>
            
            <div>
              <label htmlFor="primaryManager" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Manager *
              </label>
              <select
                id="primaryManager"
                name="primaryManager"
                value={formData.primaryManager}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select manager</option>
                <option value="Sarah Johnson">Sarah Johnson</option>
                <option value="Ahmed Hassan">Ahmed Hassan</option>
                <option value="Maria Rodriguez">Maria Rodriguez</option>
                <option value="Dr. James Wilson">Dr. James Wilson</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description & Objectives</h2>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Project Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe the project objectives, scope, and expected outcomes..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save as Draft
          </button>
          
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}