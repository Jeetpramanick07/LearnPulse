import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Navbar from '../Components/Navbar';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  const depts = [...new Set(students.map(s => s.dept))];
  const deptData = depts.map(dept => {
    const deptStudents = students.filter(s => s.dept === dept);
    return {
      dept,
      highRisk: deptStudents.filter(s => s.risk >= 70).length,
      mediumRisk: deptStudents.filter(s => s.risk >= 40 && s.risk < 70).length,
      lowRisk: deptStudents.filter(s => s.risk < 40).length,
    };
  });

  const pieData = [
    { name: 'High Risk', value: students.filter(s => s.risk >= 70).length, color: '#EF4444' },
    { name: 'Medium Risk', value: students.filter(s => s.risk >= 40 && s.risk < 70).length, color: '#F59E0B' },
    { name: 'Low Risk', value: students.filter(s => s.risk < 40).length, color: '#10B981' },
  ];

  const avgRisk = students.length ? Math.round(students.reduce((a, s) => a + s.risk, 0) / students.length) : 0;
  const avgAttendance = students.length ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / students.length) : 0;
  const avgGpa = students.length ? (students.reduce((a, s) => a + s.gpa, 0) / students.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <h2 className="text-2xl font-bold text-gray-900 mb-8">📊 Analytics Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Average Risk Score</p>
            <p className="text-3xl font-bold text-gray-900">{avgRisk}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Average Attendance</p>
            <p className="text-3xl font-bold text-gray-900">{avgAttendance}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-2">Average GPA</p>
            <p className="text-3xl font-bold text-gray-900">{avgGpa}/10</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Risk Distribution by Department
            </h3>
            {deptData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dept" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="highRisk" fill="#EF4444" name="High Risk" />
                  <Bar dataKey="mediumRisk" fill="#F59E0B" name="Medium Risk" />
                  <Bar dataKey="lowRisk" fill="#10B981" name="Low Risk" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Overall Risk Distribution
            </h3>
            {students.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}