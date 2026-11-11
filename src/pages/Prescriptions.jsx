import React, { useContext, useState, useMemo } from "react";
import { AppContext } from "../context/AppContext";
import { formatDate } from "../utils/helpers";
import { Modal } from "../components/common/Modal";
import { Badge } from "../components/common/Badge";
import {
  IoCloudUploadOutline,
  IoCheckmarkOutline,
  IoCloseOutline,
  IoEyeOutline,
  IoMedicalOutline,
  IoAddOutline,
  IoTrashOutline
} from "react-icons/io5";

export const Prescriptions = () => {
  const {
    prescriptions,
    addPrescription,
    verifyPrescription,
    medicines,
    currentUser,
    addToast
  } = useContext(AppContext);

  // States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeRx, setActiveRx] = useState(null);

  // Upload Form fields
  const [custName, setCustName] = useState("");
  const [custContact, setCustContact] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [rxItems, setRxItems] = useState([]); // [{ medicineId, name, qty }]

  // Selection state for prescription item adding
  const [tempMedId, setTempMedId] = useState("");
  const [tempQty, setTempQty] = useState("1");

  // Handlers
  const handleAddRxItem = () => {
    if (!tempMedId || !tempQty) return;
    const med = medicines.find((m) => m.id === tempMedId);
    if (!med) return;

    // Check if already in list
    if (rxItems.some((item) => item.medicineId === tempMedId)) {
      addToast("Medicine is already added to prescription list!", "warning");
      return;
    }

    setRxItems([...rxItems, { medicineId: tempMedId, name: med.name, qty: parseInt(tempQty) }]);
    setTempMedId("");
    setTempQty("1");
  };

  const handleRemoveRxItem = (medId) => {
    setRxItems(rxItems.filter((item) => item.medicineId !== medId));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!custName || !custContact || rxItems.length === 0) {
      addToast("Please provide customer details and add at least one prescribed medicine.", "warning");
      return;
    }

    addPrescription({
      customerName: custName,
      customerContact: custContact,
      doctorName: doctorName || "Self-Declared",
      notes: notes,
      fileUrl: uploadedFileName || "prescription_scanned.jpg",
      items: rxItems
    });

    // Reset
    setCustName("");
    setCustContact("");
    setDoctorName("");
    setNotes("");
    setUploadedFileName("");
    setRxItems([]);
    setShowUploadModal(false);
  };

  const handleViewPrescription = (rx) => {
    setActiveRx(rx);
    setShowViewModal(true);
  };

  const handleApprove = (id) => {
    verifyPrescription(id, "Approved");
  };

  const handleReject = (id) => {
    verifyPrescription(id, "Rejected");
  };

  // Sort prescriptions: Pending first, then Approved/Rejected
  const sortedPrescriptions = useMemo(() => {
    return [...prescriptions].sort((a, b) => {
      const statusOrder = { Pending: 1, Approved: 2, Dispensed: 3, Rejected: 4 };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [prescriptions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Prescription Verification</h1>
          <p className="text-sm text-slate-655 font-semibold mt-0.5">Pharmacist validation module for controlled and restricted substances</p>
        </div>
        {currentUser.role !== "Pharmacist" && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 cursor-pointer transition-all active:scale-[0.98] w-fit"
          >
            <IoCloudUploadOutline className="w-4.5 h-4.5" />
            <span>Upload Scanned Rx</span>
          </button>
        )}
      </div>

      {/* Role Reminder Alert Banner */}
      {currentUser.role !== "Pharmacist" && currentUser.role !== "Admin" && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <p className="text-xs text-indigo-900 font-bold leading-normal">
              Simulation Note: You are logged in as <strong className="text-indigo-950 font-black">{currentUser.role}</strong>. Switching to <strong className="text-indigo-950 font-black">Pharmacist</strong> role in the header will unlock "Approve" and "Reject" actions.
            </p>
          </div>
        </div>
      )}

      {/* Prescriptions List Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                <th className="py-3.5 px-6">RX ID</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Doctor Details</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {sortedPrescriptions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-bold">
                    No prescription files uploaded.
                  </td>
                </tr>
              ) : (
                sortedPrescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-slate-50/60 transition-colors animate-fade-in">
                    <td className="py-3.5 px-6 font-extrabold text-slate-900 font-mono">RX #{rx.id}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-bold text-slate-900">{rx.customerName}</div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">{rx.customerContact}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{rx.doctorName}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(rx.uploadedAt)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        type={
                          rx.status === "Approved"
                            ? "success"
                            : rx.status === "Dispensed"
                            ? "info"
                            : rx.status === "Rejected"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {rx.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewPrescription(rx)}
                          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="View Scanned Prescription"
                        >
                          <IoEyeOutline className="w-4 h-4" />
                        </button>
                        {rx.status === "Pending" && (currentUser.role === "Pharmacist" || currentUser.role === "Admin") && (
                          <>
                            <button
                              onClick={() => handleApprove(rx.id)}
                              className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Approve Rx"
                            >
                              <IoCheckmarkOutline className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleReject(rx.id)}
                              className="p-2 text-slate-400 hover:text-rose-750 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              title="Reject Rx"
                            >
                              <IoCloseOutline className="w-4.5 h-4.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- UPLOAD PRESCRIPTION MODAL --- */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Patient Prescription">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Patient Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Eleanor Vance"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Patient Phone
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +1-555-0155"
                value={custContact}
                onChange={(e) => setCustContact(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Prescribing Doctor
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Paul Rogers"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2 text-xs font-semibold outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Scanned File (PDF/Image)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 truncate flex items-center justify-between">
                  <span>{uploadedFileName || "Choose scan file..."}</span>
                  <IoCloudUploadOutline className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
              General Notes / Directions
            </label>
            <textarea
              placeholder="e.g. Take 1 tablet daily before food"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-4 py-2 text-xs font-semibold outline-none h-14 resize-none"
            />
          </div>

          {/* Rx Items List builder */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Prescribed Medicines Catalog Links</h4>
            
            <div className="flex gap-2">
              <select
                value={tempMedId}
                onChange={(e) => setTempMedId(e.target.value)}
                className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium outline-none"
              >
                <option value="">-- Select Product --</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.brand})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={tempQty}
                onChange={(e) => setTempQty(e.target.value)}
                className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium outline-none text-center"
              />
              <button
                type="button"
                onClick={handleAddRxItem}
                className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <IoAddOutline className="w-4 h-4" /> Add
              </button>
            </div>

            {/* List of items built */}
            {rxItems.length > 0 && (
              <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl overflow-hidden text-xs">
                {rxItems.map((item) => (
                  <div key={item.medicineId} className="flex justify-between items-center px-3 py-2">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500">Qty: {item.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRxItem(item.medicineId)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <IoTrashOutline className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Submit Prescription
            </button>
          </div>
        </form>
      </Modal>

      {/* --- VIEW SCAN MODAL --- */}
      <Modal isOpen={showViewModal} onClose={() => { setShowViewModal(false); setActiveRx(null); }} title="Scanned Prescription Scan File" size="md">
        {activeRx && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Patient Info</h3>
                  <p className="text-xs font-bold text-slate-700">{activeRx.customerName}</p>
                  <p className="text-[10px] text-slate-400">{activeRx.customerContact}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prescribing Clinician</h3>
                  <p className="text-xs text-slate-600 font-semibold">{activeRx.doctorName}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prescribed Items</h3>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    {activeRx.items.map((item) => (
                      <div key={item.medicineId} className="flex justify-between">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="font-bold text-slate-500">Qty: {item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {activeRx.notes && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pharmacist Notes</h3>
                    <p className="text-[10px] text-slate-500 leading-tight italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      "{activeRx.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Scan Document Mock */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[250px] relative text-center">
                <div className="absolute top-3 left-3 bg-white/70 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-slate-400 border border-slate-100">
                  SCAN FILE ATTACHED
                </div>
                <IoMedicalOutline className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-xs font-bold text-slate-600">Prescription Rx Verification Card</h4>
                <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">Doctor Signature Verified</p>
                <div className="mt-4 border border-slate-200 bg-white px-4 py-2.5 rounded-lg shadow-xs font-mono text-[8px] text-left text-slate-400">
                  Rx Ref: #{activeRx.id}<br />
                  Signature Auth Code: Ross.M55<br />
                  Secure Timestamp: {formatDate(activeRx.uploadedAt)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowViewModal(false); setActiveRx(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {activeRx.status === "Pending" && (currentUser.role === "Pharmacist" || currentUser.role === "Admin") && (
                <>
                  <button
                    onClick={() => { handleReject(activeRx.id); setShowViewModal(false); }}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reject Rx
                  </button>
                  <button
                    onClick={() => { handleApprove(activeRx.id); setShowViewModal(false); }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Approve & Verify Rx
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
