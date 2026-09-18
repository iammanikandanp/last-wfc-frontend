import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import CustomBaseUrl from '../hooks/CustomBaseUrl';
import { Trash2, RefreshCw, AlertCircle, Clock } from 'lucide-react';

const RecycleBin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await CustomBaseUrl.get('/recycle-bin');
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch recycle bin items", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    if (!window.confirm("Restore this item to its original location?")) return;
    setRestoringId(id);
    try {
      const res = await CustomBaseUrl.post(`/recycle-bin/${id}/restore`);
      if (res.data.success) {
        setItems((prev) => prev.filter((item) => item._id !== id));
      } else {
        alert(res.data.message || "Failed to restore item.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Error restoring item.");
    } finally {
      setRestoringId(null);
    }
  };

  const getDaysLeft = (expiresAt) => {
    const diffTime = Math.max(0, new Date(expiresAt) - new Date());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper to format preview data
  const renderDataPreview = (collection, data) => {
    if (!data) return "No preview available";
    switch (collection) {
      case "Registration":
        return `Member: ${data.name} (${data.phone || 'No phone'})`;
      case "Expense":
        return `Expense: ${data.title} - ₹${data.amount}`;
      case "Income":
        return `Income: ${data.title} - ₹${data.amount}`;
      case "CafeteriaTransaction":
        return `Cafeteria: ${data.memberName} - Total: ₹${data.totalAmount || 0}`;
      case "RegPayment":
        return `Payment: ${data.memberName} - Amount: ₹${data.finalAmount || 0}`;
      case "HealthRecord":
        return `Health Record (BP: ${data.bloodPressure || 'N/A'}, Sugar: ${data.sugarLevel || 'N/A'})`;
      case "MemberProgress":
        return `Progress Record (Weight: ${data.weight || 'N/A'} kg, BMI: ${data.bmi || 'N/A'})`;
      case "ProgressPhotoSession":
        return `Photo Session (Front/Side/Back photos)`;
      case "WeightHistory":
        return `Weight History: ${data.weight} kg on ${new Date(data.recordDate).toLocaleDateString('en-IN')}`;
      default:
        return `Deleted record from ${collection}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
            <Trash2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Recycle Bin</h1>
            <p className="text-sm font-medium text-slate-500">Deleted items are permanently removed after 5 days.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw size={24} className="mx-auto text-slate-300 animate-spin mb-4" />
              <p className="text-sm font-semibold text-slate-500">Loading deleted items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Recycle Bin is empty</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Items you delete will appear here and can be restored within 5 days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Details</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Collection</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Deleted At</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Expires In</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <AlertCircle size={14} />
                          </div>
                          <div className="max-w-[200px] sm:max-w-[300px] truncate text-sm font-semibold text-slate-800">
                            {renderDataPreview(item.originalCollection, item.data)}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wide">
                          {item.originalCollection}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-slate-500">
                        {new Date(item.deletedAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-50 w-fit px-2 py-1 rounded-md">
                          <Clock size={12} />
                          {getDaysLeft(item.expiresAt)} days
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleRestore(item._id)}
                          disabled={restoringId === item._id}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {restoringId === item._id ? (
                            <span className="flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Restoring</span>
                          ) : (
                            "Restore"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecycleBin;
