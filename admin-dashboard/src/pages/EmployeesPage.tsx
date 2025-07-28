import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Mail,
  MapPin,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import { employeeApi } from '../utils/api'
import toast from 'react-hot-toast'

interface Employee {
  id: number
  name: string
  email: string
  is_active: boolean
  is_activated: boolean
  created_at: string
  updated_at: string | null
}

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    is_active: true
  })

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await employeeApi.getAll()
      if (response.success) {
        setEmployees(response.data)
      } else {
        toast.error('Failed to load employees')
      }
    } catch (error) {
      toast.error('Error loading employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && employee.is_active && employee.is_activated) ||
      (filterStatus === 'inactive' && !employee.is_active) ||
      (filterStatus === 'pending' && !employee.is_activated)

    return matchesSearch && matchesFilter
  })

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await employeeApi.create(formData)
      if (response.success) {
        toast.success('Employee added successfully')
        setShowAddModal(false)
        setFormData({ name: '', email: '', password: '', is_active: true })
        fetchEmployees()
      } else {
        toast.error(response.error || 'Failed to add employee')
      }
    } catch (error) {
      toast.error('Error adding employee')
    }
  }

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEmployee) return

    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        is_active: formData.is_active
      }
      const response = await employeeApi.update(editingEmployee.id, updateData)
      if (response.success) {
        toast.success('Employee updated successfully')
        setEditingEmployee(null)
        setFormData({ name: '', email: '', password: '', is_active: true })
        fetchEmployees()
      } else {
        toast.error(response.error || 'Failed to update employee')
      }
    } catch (error) {
      toast.error('Error updating employee')
    }
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await employeeApi.delete(employee.id)
      if (response.success) {
        toast.success('Employee deleted successfully')
        fetchEmployees()
      } else {
        toast.error(response.error || 'Failed to delete employee')
      }
    } catch (error) {
      toast.error('Error deleting employee')
    }
  }

  const handleActivateEmployee = async (employee: Employee) => {
    try {
      const response = await employeeApi.activate(employee.id, { is_activated: !employee.is_activated })
      if (response.success) {
        toast.success(`Employee ${employee.is_activated ? 'deactivated' : 'activated'} successfully`)
        fetchEmployees()
      } else {
        toast.error(response.error || 'Failed to update activation status')
      }
    } catch (error) {
      toast.error('Error updating activation status')
    }
  }

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      is_active: employee.is_active
    })
  }

  const exportEmployees = () => {
    const csv = [
      ['Name', 'Email', 'Status', 'Activated', 'Created'],
      ...filteredEmployees.map(emp => [
        emp.name,
        emp.email,
        emp.is_active ? 'Active' : 'Inactive',
        emp.is_activated ? 'Yes' : 'No',
        new Date(emp.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Employee list exported')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage team members, roles, and access permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportEmployees}
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search employees..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="input w-auto"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All Employees</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending Activation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
            <p className="text-sm text-gray-600">Total Employees</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {employees.filter(e => e.is_active && e.is_activated).length}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {employees.filter(e => !e.is_active).length}
            </p>
            <p className="text-sm text-gray-600">Inactive</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {employees.filter(e => !e.is_activated).length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`block text-xs ${
                        employee.is_activated ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {employee.is_activated ? '✓ Activated' : '⏳ Pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(employee.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="text-primary-600 hover:text-primary-900 p-1"
                        title="Edit employee"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleActivateEmployee(employee)}
                        className={`p-1 ${employee.is_activated ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                        title={employee.is_activated ? 'Deactivate' : 'Activate'}
                      >
                        {employee.is_activated ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-3">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-500">No employees found matching your criteria</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-primary-600 hover:text-primary-500 text-sm mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Employee</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="input mt-1"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Password</label>
                  <input
                    type="password"
                    className="input mt-1"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave empty for activation email"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="text-sm text-gray-700">Active employee</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Employee</h3>
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="input mt-1"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="text-sm text-gray-700">Active employee</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeesPage
