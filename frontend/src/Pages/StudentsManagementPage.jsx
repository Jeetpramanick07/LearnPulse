import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Papa from 'papaparse';
import Navbar from '../Components/Navbar';
import Toast from '../Components/Toast';

export default function StudentsManagementPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [formData, setFormData] = useState({
    name: '', roll: '', dept: 'CS', gpa: '', attendance: '',
  });

  useEffect(() => { loadStudents(); }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast({ message: '', type: 'success' });

  const loadStudents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'students'));
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'students'), {
        ...formData,
        gpa: parseFloat(formData.gpa),
        attendance: parseInt(formData.attendance),
        risk: calculateRisk(parseFloat(formData.gpa), parseInt(formData.attendance)),
        createdAt: new Date()
      });
      setShowAddModal(false);
      setFormData({ name: '', roll: '', dept: 'CS', gpa: '', attendance: '' });
      loadStudents();
      showToast('Student added successfully!', 'success');
    } catch (error) {
      console.error('Error adding student:', error);
      showToast('Failed to add student', 'error');
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      const studentRef = doc(db, 'students', editingStudent.id);
      await updateDoc(studentRef, {
        ...formData,
        gpa: parseFloat(formData.gpa),
        attendance: parseInt(formData.attendance),
        risk: calculateRisk(parseFloat(formData.gpa), parseInt(formData.attendance)),
        updatedAt: new Date()
      });
      setShowEditModal(false);
      setEditingStudent(null);
      setFormData({ name: '', roll: '', dept: 'CS', gpa: '', attendance: '' });
      loadStudents();
      showToast('Student updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating student:', error);
      showToast('Failed to update student', 'error');
    }
  };

  const handleDeleteStudent = async (id) => {
    try {
      await deleteDoc(doc(db, 'students', id));
      loadStudents();
      showToast('Student deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting student:', error);
      showToast('Failed to delete student', 'error');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          for (const row of results.data) {
            if (row.name && row.roll) {
              await addDoc(collection(db, 'students'), {
                name: row.name, roll: row.roll, dept: row.dept || 'CS',
                gpa: parseFloat(row.gpa) || 0, attendance: parseInt(row.attendance) || 0,
                risk: calculateRisk(parseFloat(row.gpa) || 0, parseInt(row.attendance) || 0),
                createdAt: new Date()
              });
            }
          }
          loadStudents();
          showToast(`Successfully uploaded ${results.data.length} students!`, 'success');
        } catch (error) {
          console.error('Error uploading CSV:', error);
          showToast('Failed to upload some students', 'error');
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        showToast('Failed to parse CSV file', 'error');
        setUploading(false);
      }
    });
  };

  const calculateRisk = (gpa, attendance) => {
    let risk = 0;
    if (gpa < 5) risk += 40; else if (gpa < 7) risk += 20;
    if (attendance < 50) risk += 40; else if (attendance < 75) risk += 20;
    return Math.min(risk, 95);
  };

  const openEditModal = (e, student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setFormData({ name: student.name, roll: student.roll, dept: student.dept, gpa: student.gpa, attendance: student.attendance });
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Toast message={toast.message} type={toast.type} onClose={closeToast} />

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <div className="flex gap-3">
            <label className="px-4 py-2 bg-white border-2 border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              {uploading ? 'Uploading...' : '📤 Upload CSV'}
              <input type="file" accept=".csv" onChange={handleCSVUpload} disabled={uploading} className="hidden" />
            </label>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700">
              + Add Student
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-500">Loading students...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GPA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No students yet. Add students using the buttons above.
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} onClick={() => navigate('/student/' + student.id)} className="hover:bg-purple-50 cursor-pointer transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.roll}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.dept}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.gpa}/10</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.attendance}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (student.risk >= 70 ? 'bg-red-100 text-red-700' : student.risk >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                          {student.risk}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={(e) => openEditModal(e, student)} className="text-purple-600 hover:text-purple-900 mr-4">Edit</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(student.id); }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Custom Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Student</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this student? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteStudent(confirmDelete)}
                className="flex-1 bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input type="text" placeholder="Student Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <input type="text" placeholder="Roll Number" value={formData.roll} onChange={(e) => setFormData({...formData, roll: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <select value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="CS">Computer Science</option>
                <option value="IT">Information Technology</option>
                <option value="ECE">Electronics</option>
                <option value="MECH">Mechanical</option>
              </select>
              <input type="number" step="0.1" min="0" max="10" placeholder="GPA (0-10)" value={formData.gpa} onChange={(e) => setFormData({...formData, gpa: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <input type="number" min="0" max="100" placeholder="Attendance %" value={formData.attendance} onChange={(e) => setFormData({...formData, attendance: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700">Add Student</button>
                <button type="button" onClick={() => { setShowAddModal(false); setFormData({ name: '', roll: '', dept: 'CS', gpa: '', attendance: '' }); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Student</h3>
            <form onSubmit={handleEditStudent} className="space-y-4">
              <input type="text" placeholder="Student Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <input type="text" placeholder="Roll Number" value={formData.roll} onChange={(e) => setFormData({...formData, roll: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <select value={formData.dept} onChange={(e) => setFormData({...formData, dept: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                <option value="CS">Computer Science</option>
                <option value="IT">Information Technology</option>
                <option value="ECE">Electronics</option>
                <option value="MECH">Mechanical</option>
              </select>
              <input type="number" step="0.1" min="0" max="10" placeholder="GPA (0-10)" value={formData.gpa} onChange={(e) => setFormData({...formData, gpa: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <input type="number" min="0" max="100" placeholder="Attendance %" value={formData.attendance} onChange={(e) => setFormData({...formData, attendance: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700">Update Student</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingStudent(null); setFormData({ name: '', roll: '', dept: 'CS', gpa: '', attendance: '' }); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}