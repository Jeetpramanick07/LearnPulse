import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../Components/Navbar';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [allStudents, setAllStudents] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllStudents(studentsData);
    });
    return () => unsubscribe();
  }, []);

  // Filter students
  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.roll.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === 'all' || student.dept === filterDept;
    const matchesRisk = filterRisk === 'all' || 
                       (filterRisk === 'high' && student.risk >= 70) ||
                       (filterRisk === 'medium' && student.risk >= 40 && student.risk < 70) ||
                       (filterRisk === 'low' && student.risk < 40);
    return matchesSearch && matchesDept && matchesRisk;
  });

  // Calculate stats
  const totalStudents = allStudents.length;
  const highRisk = allStudents.filter(s => s.risk >= 70).length;
  const mediumRisk = allStudents.filter(s => s.risk >= 40 && s.risk < 70).length;
  const lowRisk = allStudents.filter(s => s.risk < 40).length;

  const getRiskBadge = (risk) => {
    if (risk >= 70) {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full">
        🔴 {risk}% High
      </span>;
    } else if (risk >= 40) {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-full">
        🟡 {risk}% Medium
      </span>;
    } else {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
        🟢 {risk}% Low
      </span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Students</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🔴</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{highRisk}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">High Risk</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🟡</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{mediumRisk}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Medium Risk</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">🟢</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{lowRisk}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Low Risk</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="all">All Departments</option>
              <option value="CS">Computer Science</option>
              <option value="IT">Information Technology</option>
              <option value="ECE">Electronics</option>
              <option value="MECH">Mechanical</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-2">Student</div>
              <div>Department</div>
              <div>GPA</div>
              <div>Attendance</div>
              <div>Risk Score</div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No students found matching your filters
              </div>
            ) : (
              filteredStudents.map((student) => (
                <div
                  key={student.id}
                  onClick={() => navigate(`/student/${student.id}`)}
                  className="px-6 py-4 hover:bg-purple-50 cursor-pointer transition group"
                >
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="col-span-2">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.roll}</p>
                    </div>
                    <div className="text-sm text-gray-600">{student.dept}</div>
                    <div className="text-sm font-medium text-gray-900">{student.gpa}/10</div>
                    <div className="text-sm text-gray-600">{student.attendance}%</div>
                    <div className="flex items-center justify-between">
                      {getRiskBadge(student.risk)}
                      <button className="opacity-0 group-hover:opacity-100 text-purple-600 hover:text-purple-700 transition">
                        →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
            <p className="text-sm text-gray-500">
              Showing {filteredStudents.length} of {totalStudents} students
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}