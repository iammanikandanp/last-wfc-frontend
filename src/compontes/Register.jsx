import React, { useState, useEffect } from "react";
import CustomBaseUrl from "../hooks/CustomBaseUrl";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, X, ArrowLeft, Check } from "lucide-react";

// ── Reusable components ───────────────────────────────────────────────────────
const Input = ({ label, required = false, isTextArea, ...props }) => (
  <div className="mb-3">
    <label className="block mb-1.5 text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {isTextArea ? (
      <textarea className="w-full border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition resize-none text-sm" rows="3" {...props}/>
    ) : (
      <input className="w-full border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition text-sm" {...props}/>
    )}
  </div>
);

const Select = ({ label, name, value, onChange, options, required = false }) => (
  <div className="mb-3">
    <label className="block mb-1.5 text-sm font-semibold text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <select name={name} value={value} onChange={onChange}
      className="w-full border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition bg-white text-sm">
      <option value="" disabled hidden>Select…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ── Image upload with preview — shows existing URL or new file preview ────────
const ImageUploadField = ({ label, name, onFileChange, preview, onRemove }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 transition">
    <label className="block mb-2 text-sm font-semibold text-gray-700">{label}</label>
    {preview ? (
      <div className="relative">
        <img src={preview} alt={label} className="w-full h-40 object-cover rounded-lg mb-2"
          onError={e => e.target.style.display='none'} />
        <button type="button" onClick={() => onRemove(name)}
          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow">
          <X size={13} />
        </button>
        <label className="block text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-semibold text-center">
          Change Photo
          <input type="file" accept="image/*" className="hidden"
            onChange={e => { if(e.target.files[0]) onFileChange(name, e.target.files[0]); }} />
        </label>
      </div>
    ) : (
      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-red-400 hover:bg-red-50 transition">
          <Upload className="w-7 h-7 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 mb-0.5">Click to upload</p>
          <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
        </div>
        <input type="file" accept="image/*" className="hidden"
          onChange={e => { if(e.target.files[0]) onFileChange(name, e.target.files[0]); }} />
      </label>
    )}
  </div>
);

// ── Default form state ────────────────────────────────────────────────────────
const defaultForm = () => ({
  fullName:"", age:"", dateOfBirth:"", phoneNumber:"", email:"",
  emergencyContact:"", medicalConditions:"", attendanceId:"",
  gender:"", height:"", weight:"", waist:"", hip:"", chest:"",
  arm:"", thigh:"", bloodGroup:"", bloodPressure:"", sugarLevel:"",
  bodyFat:"", neck:"", bmi:"", fitnessCategory:"",
  profession:"", address:"", city:"", state:"", pincode:"",
  packages:"Basic", duration:"1", services:"No",
  startDate: new Date().toISOString().split("T")[0],
  endDate:   new Date(Date.now()+30*24*60*60*1000).toISOString().split("T")[0],
  issues:"None",
});

// ── Main Register/Edit component ──────────────────────────────────────────────
export const Register = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData;
  const isEdit    = !!editData;

  const [step,        setStep]        = useState(1);
  const [bmiStatus,   setBmiStatus]   = useState("");
  const [bodyFatStatus, setBodyFatStatus] = useState(""); // auto from Navy formula
  const [isSubmitting,setIsSubmitting]= useState(false);
  const [formData,    setFormData]    = useState(defaultForm());

  // imageFiles: new File objects chosen by user (null = keep existing)
  const [imageFiles, setImageFiles]   = useState({
    profileImage: null, frontBodyImage: null, sideBodyImage: null, backBodyImage: null,
  });
  // imagePreviews: what to show — starts as existing URL, replaced by blob URL when new file chosen
  const [imagePreviews, setImagePreviews] = useState({
    profileImage: null, frontBodyImage: null, sideBodyImage: null, backBodyImage: null,
  });

  // ── Pre-fill form when editing ─────────────────────────────────────────────
  useEffect(() => {
    if (!editData) return;
    const parts = (editData.address || "").split(", ");
    const addr  = parts[0] || "";
    const city  = parts[1] || "";
    const state = parts[2] || "";

    setFormData({
      fullName:          editData.name        || "",
      age:               String(editData.age  || ""),
      dateOfBirth:       "",
      phoneNumber:       editData.phone       || "",
      email:             editData.emails      || "",
      emergencyContact:  "",
      medicalConditions: editData.description || "",
      attendanceId:      editData.attendanceId|| "",
      gender:            editData.gender      || "",
      height:            String(editData.height || ""),
      weight:            String(editData.weight || ""),
      waist:             String(editData.waist  || ""),
      hip:               String(editData.hip    || ""),
      chest:             "",
      arm:               "",
      thigh:             "",
      bloodGroup:        editData.bloodGroup    || "",
      bloodPressure:     editData.bloodPressure || "",
      sugarLevel:        editData.sugarLevel    || "",
      bodyFat:           String(editData.bodyFat || ""),
      neck:              String(editData.neck    || ""),
      bmi:               String(editData.bmi     || ""),
      fitnessCategory:   editData.statusLevel   || "",
      profession:        editData.profession    || "",
      address:           addr,
      city,
      state,
      pincode:           editData.pincode   || "",
      packages:          editData.packages  || "Basic",
      duration:          String(editData.duration || "1"),
      services:          editData.services  || "No",
      startDate:         editData.startDate?.split("T")[0] || new Date().toISOString().split("T")[0],
      endDate:           editData.endDate?.split("T")[0]   || new Date(Date.now()+30*24*60*60*1000).toISOString().split("T")[0],
      issues:            editData.issues    || "None",
    });

    // Show existing images as previews — but imageFiles stays null (no new file chosen yet)
    setImagePreviews({
      profileImage:   editData.images?.profileImage   || null,
      frontBodyImage: editData.images?.frontBodyImage || null,
      sideBodyImage:  editData.images?.sideBodyImage  || null,
      backBodyImage:  editData.images?.backBodyImage  || null,
    });
  }, []); // run once on mount only

  // ── BMI + Body Fat auto-calc ─────────────────────────────────────────────────
  useEffect(() => {
    const h   = parseFloat(formData.height);   // cm
    const w   = parseFloat(formData.weight);   // kg
    const hM  = h / 100;                       // metres

    // ── BMI ──────────────────────────────────────────────────────────────────
    if (h > 0 && w > 0) {
      const bmi = (w / (hM * hM)).toFixed(1);
      const cat = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
      setBmiStatus(cat);
      setFormData(prev => ({ ...prev, bmi }));
    }

    // ── Body Fat % — U.S. Navy circumference method ───────────────────────────
    // Male:   %BF = 495 / (1.0324 − 0.19077×log10(waist−neck) + 0.15456×log10(height)) − 450
    // Female: %BF = 495 / (1.29579 − 0.35004×log10(waist+hip−neck) + 0.22100×log10(height)) − 450
    const waist = parseFloat(formData.waist);
    const neck  = parseFloat(formData.neck);
    const hip   = parseFloat(formData.hip);

    if (h > 0 && waist > 0 && neck > 0) {
      let bf = null;

      if (formData.gender === "Male" && waist > neck) {
        const val = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
        if (!isNaN(val) && val > 0) bf = val.toFixed(1);
      } else if (formData.gender === "Female" && hip > 0 && waist > 0) {
        const val = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h)) - 450;
        if (!isNaN(val) && val > 0) bf = val.toFixed(1);
      }

      if (bf) {
        // Body fat status by gender
        let status = "";
        const bfN = parseFloat(bf);
        if (formData.gender === "Male") {
          status = bfN < 6 ? "Essential Fat" : bfN < 14 ? "Athlete" : bfN < 18 ? "Fit" : bfN < 25 ? "Acceptable" : "Obese";
        } else if (formData.gender === "Female") {
          status = bfN < 14 ? "Essential Fat" : bfN < 21 ? "Athlete" : bfN < 25 ? "Fit" : bfN < 32 ? "Acceptable" : "Obese";
        }
        setBodyFatStatus(status);
        setFormData(prev => ({ ...prev, bodyFat: bf }));
      }
    }
  }, [formData.height, formData.weight, formData.waist, formData.neck, formData.hip, formData.gender]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Called when user picks a new image file
  const handleFileChange = (fieldName, file) => {
    setImageFiles(prev => ({ ...prev, [fieldName]: file }));
    setImagePreviews(prev => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
  };

  // Remove image — clears both the file and the preview
  const handleRemove = (fieldName) => {
    setImageFiles(prev => ({ ...prev, [fieldName]: null }));
    setImagePreviews(prev => ({ ...prev, [fieldName]: null }));
  };

  const isValidPhone = p => /^\d{10}$/.test(p);

  // ── Step validation before Next ────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!formData.fullName.trim()) return toast.error("Full name is required");
      if (formData.phoneNumber && !isValidPhone(formData.phoneNumber))
        return toast.error("Invalid 10-digit phone number");
    }
    if (step === 2 && !formData.gender) return toast.error("Please select gender");
    if (step < 4) setStep(s => s + 1);
  };

  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  // ── Final submit — ONLY called by the submit button on step 4 ──────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (step !== 4) return; // safety guard

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name",          formData.fullName);
      fd.append("age",           formData.age);
      fd.append("gender",        formData.gender);
      fd.append("emails",        formData.email);
      fd.append("phone",         formData.phoneNumber);
      fd.append("profession",    formData.profession);
      fd.append("address",       [formData.address, formData.city, formData.state].filter(Boolean).join(", "));
      fd.append("pincode",       formData.pincode);
      fd.append("height",        formData.height);
      fd.append("weight",        formData.weight);
      fd.append("bmi",           formData.bmi || "");
      fd.append("waist",         formData.waist);
      fd.append("hip",           formData.hip);
      fd.append("neck",          formData.neck   || "");
      fd.append("bodyFat",       formData.bodyFat|| "");
      fd.append("bloodPressure", formData.bloodPressure || "");
      fd.append("sugarLevel",    formData.sugarLevel    || "");
      fd.append("bloodGroup",    formData.bloodGroup    || "O+");
      fd.append("issues",        formData.issues        || "None");
      fd.append("description",   formData.medicalConditions || "None");
      fd.append("packages",      formData.packages);
      fd.append("duration",      formData.duration);
      fd.append("services",      formData.services);
      fd.append("startDate",     formData.startDate);
      fd.append("endDate",       formData.endDate);
      fd.append("attendanceId",  formData.attendanceId || "");

      // Only append image if a NEW file was chosen — backend keeps existing if not sent
      if (imageFiles.profileImage)   fd.append("profileImage",   imageFiles.profileImage);
      if (imageFiles.frontBodyImage) fd.append("frontBodyImage", imageFiles.frontBodyImage);
      if (imageFiles.sideBodyImage)  fd.append("sideBodyImage",  imageFiles.sideBodyImage);
      if (imageFiles.backBodyImage)  fd.append("backBodyImage",  imageFiles.backBodyImage);

      const url = isEdit ? `/update/${editData._id}` : `/register`;

      await CustomBaseUrl.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });

      toast.success(isEdit ? "Member updated!" : "Registered successfully!");
      setTimeout(() => navigate("/members"), 1200);
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.response?.data?.message || "Submission failed!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step Indicator ─────────────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="mb-7">
      <div className="flex items-center mb-1.5">
        {[1,2,3,4].map((n,i) => (
          <React.Fragment key={n}>
            <div onClick={() => isEdit && n < step && setStep(n)}
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs transition-all flex-shrink-0
                ${step===n?'bg-red-600 text-white shadow-md scale-110':step>n?'bg-green-500 text-white cursor-pointer':'bg-gray-200 text-gray-500'}`}>
              {step > n ? "✓" : n}
            </div>
            {i < 3 && <div className={`flex-1 h-1 mx-1.5 rounded-full transition-all ${step>n?'bg-green-400':'bg-gray-200'}`}/>}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
        <span>Basic Info</span><span>Measurements</span><span>Address</span><span>Photos</span>
      </div>
    </div>
  );

  // ── Step 1 ─────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <h3 className="font-bold text-xl text-gray-800 mb-5">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Full Name"         name="fullName"        value={formData.fullName}        onChange={handleChange} placeholder="Full name" required />
        <Input label="Age"               name="age"             value={formData.age}             onChange={handleChange} type="number" placeholder="Age" />
        <Input label="Date of Birth"     name="dateOfBirth"     value={formData.dateOfBirth}     onChange={handleChange} type="date" />
        <Input label="Phone Number"      name="phoneNumber"     value={formData.phoneNumber}     onChange={handleChange} type="tel" placeholder="10-digit phone" />
        <Input label="Email"             name="email"           value={formData.email}           onChange={handleChange} type="email" placeholder="Email address" />
        <Input label="Emergency Contact" name="emergencyContact"value={formData.emergencyContact}onChange={handleChange} type="tel" placeholder="Emergency phone" />
        <div className="mb-3">
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            Attendance ID <span className="text-gray-400 font-normal text-xs">(from XLS machine)</span>
          </label>
          <input name="attendanceId" value={formData.attendanceId} onChange={handleChange}
            placeholder="e.g. 18, 31 (from 01USERLIST.XLS)"
            className="w-full border-2 border-blue-200 bg-blue-50 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm" />
          <p className="text-[10px] text-blue-500 mt-1">Links this member to attendance records</p>
        </div>
        <Input label="Medical Conditions" name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} placeholder="Any conditions (optional)" isTextArea />
      </div>
    </>
  );

  // ── Step 2 ─────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <>
      <h3 className="font-bold text-xl text-gray-800 mb-5">Body Measurements</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Select label="Gender"     name="gender"     value={formData.gender}     onChange={handleChange} options={["Male","Female","Other"]} required />
        <Select label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} options={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} />
        <Input label="Height (cm)" name="height" value={formData.height} onChange={handleChange} type="number" placeholder="cm" />
        <Input label="Weight (kg)" name="weight" value={formData.weight} onChange={handleChange} type="number" placeholder="kg" />
        {/* BMI result card */}
        {formData.bmi && (
          <div className={`md:col-span-2 mb-2 flex items-center gap-3 p-3 rounded-xl border ${
            bmiStatus==='Normal'?'bg-green-50 border-green-200':
            bmiStatus==='Underweight'?'bg-blue-50 border-blue-200':
            bmiStatus==='Overweight'?'bg-amber-50 border-amber-200':
            'bg-red-50 border-red-200'
          }`}>
            <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
              bmiStatus==='Normal'?'bg-green-100':
              bmiStatus==='Underweight'?'bg-blue-100':
              bmiStatus==='Overweight'?'bg-amber-100':'bg-red-100'
            }`}>
              <span className="text-lg font-black leading-none">{formData.bmi}</span>
              <span className="text-[9px] font-semibold opacity-60">BMI</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">BMI — Auto Calculated</p>
              <p className={`text-sm font-black ${
                bmiStatus==='Normal'?'text-green-600':
                bmiStatus==='Underweight'?'text-blue-600':
                bmiStatus==='Overweight'?'text-amber-600':'text-red-600'
              }`}>{bmiStatus}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {bmiStatus==='Normal'?'Healthy weight range':
                 bmiStatus==='Underweight'?'Below healthy weight':
                 bmiStatus==='Overweight'?'Above healthy weight':'High health risk'}
              </p>
            </div>
          </div>
        )}

        <Input label="Waist (cm)"  name="waist" value={formData.waist} onChange={handleChange} type="number" placeholder="cm" />
        <Input label="Neck (cm)"   name="neck"  value={formData.neck}  onChange={handleChange} type="number" placeholder="cm" />
        <Input label="Hip (cm)"    name="hip"   value={formData.hip}   onChange={handleChange} type="number" placeholder={formData.gender==='Male'?'Not required for Male':'cm'} />
        <Input label="Chest (cm)"  name="chest" value={formData.chest} onChange={handleChange} type="number" placeholder="cm" />
        <Input label="Arm (cm)"    name="arm"   value={formData.arm}   onChange={handleChange} type="number" placeholder="cm" />

        {/* Body Fat % — auto from Navy formula, but editable */}
        <div className="mb-3">
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">
            Body Fat %
            {formData.bodyFat && bodyFatStatus && (
              <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                Auto-calculated
              </span>
            )}
          </label>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input name="bodyFat" type="number" value={formData.bodyFat} onChange={handleChange}
                placeholder={
                  formData.gender==='Male' ? 'Enter waist + neck to auto-calc' :
                  formData.gender==='Female' ? 'Enter waist + hip + neck to auto-calc' :
                  'Select gender first'
                }
                className="w-full border-2 border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 text-sm transition"/>
            </div>
            {formData.bodyFat && bodyFatStatus && (
              <div className={`flex-shrink-0 text-center px-3 py-2 rounded-xl text-xs font-bold ${
                bodyFatStatus==='Athlete'||bodyFatStatus==='Fit'?'bg-emerald-100 text-emerald-700':
                bodyFatStatus==='Acceptable'?'bg-amber-100 text-amber-700':
                bodyFatStatus==='Obese'?'bg-red-100 text-red-700':
                'bg-blue-100 text-blue-700'
              }`}>
                <p className="text-lg font-black leading-none">{formData.bodyFat}%</p>
                <p>{bodyFatStatus}</p>
              </div>
            )}
          </div>
          {formData.gender === 'Male' && (
            <p className="text-[10px] text-gray-400 mt-1">U.S. Navy formula · Requires: Height + Waist + Neck</p>
          )}
          {formData.gender === 'Female' && (
            <p className="text-[10px] text-gray-400 mt-1">U.S. Navy formula · Requires: Height + Waist + Hip + Neck</p>
          )}
        </div>
        <Input label="Blood Pressure"   name="bloodPressure" value={formData.bloodPressure} onChange={handleChange} placeholder="e.g. 120/80" />
        <Input label="Sugar Level (mg/dL)" name="sugarLevel"  value={formData.sugarLevel}    onChange={handleChange} type="number" placeholder="mg/dL" />
      </div>
    </>
  );

  // ── Step 3 ─────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <>
      <h3 className="font-bold text-xl text-gray-800 mb-5">Address & Membership</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <Input label="Profession" name="profession" value={formData.profession} onChange={handleChange} placeholder="e.g. Engineer" />
        <Input label="Pincode"    name="pincode"    value={formData.pincode}    onChange={handleChange} placeholder="6-digit pincode" />
        <div className="md:col-span-2">
          <Input label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Street address" isTextArea />
        </div>
        <Input label="City"  name="city"  value={formData.city}  onChange={handleChange} placeholder="City" />
        <Input label="State" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
        {/* <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-1">
          <h4 className="font-bold text-gray-700 mb-3 text-sm">Membership Details</h4>
        </div>
        <Select label="Package"           name="packages" value={formData.packages} onChange={handleChange} options={["Basic","Standard","Premium","Offer","Custom"]} />
        <Select label="Duration (months)" name="duration" value={formData.duration} onChange={handleChange} options={["1","2","3","4","5","6","7","8","9","10","11","12"]} />
        <Input  label="Start Date" name="startDate" value={formData.startDate} onChange={handleChange} type="date" />
        <Input  label="End Date"   name="endDate"   value={formData.endDate}   onChange={handleChange} type="date" />
        <Select label="Services" name="services" value={formData.services} onChange={handleChange} options={["No","Personal Training","Custom Workout","Custom Diet","Rehab Therapy","All"]} />
        <Select label="Medical Issues" name="issues" value={formData.issues} onChange={handleChange} options={["None","Diabetes","Hypertension","Heart Disease","Arthritis","Other"]} /> */}
      </div>
    </>
  );

  // ── Step 4 — Photos. NO auto-submit. User must click the button. ───────────
  const renderStep4 = () => (
    <>
      <h3 className="font-bold text-xl text-gray-800 mb-1">
        {isEdit ? "Update Photos" : "Progress Photos"}
      </h3>
      <p className="text-sm text-gray-400 mb-5">
        {isEdit
          ? "Existing photos shown below. Upload new ones to replace, or leave as-is."
          : "Optional — upload photos. Click the button below to finish registration."
        }
      </p>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        <ImageUploadField label="Profile Photo 📸"  name="profileImage"
          onFileChange={handleFileChange} preview={imagePreviews.profileImage}   onRemove={handleRemove} />
        <ImageUploadField label="Front View 🧍"     name="frontBodyImage"
          onFileChange={handleFileChange} preview={imagePreviews.frontBodyImage} onRemove={handleRemove} />
        <ImageUploadField label="Side View 👤"      name="sideBodyImage"
          onFileChange={handleFileChange} preview={imagePreviews.sideBodyImage}  onRemove={handleRemove} />
        <ImageUploadField label="Back View 🔙"      name="backBodyImage"
          onFileChange={handleFileChange} preview={imagePreviews.backBodyImage}  onRemove={handleRemove} />
      </div>

      {/* Summary */}
      <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Summary</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>Name: <strong>{formData.fullName}</strong></span>
          <span>Phone: <strong>{formData.phoneNumber}</strong></span>
          <span>Package: <strong>{formData.packages}</strong></span>
          <span>Duration: <strong>{formData.duration} month(s)</strong></span>
          <span>Start: <strong>{formData.startDate}</strong></span>
          <span>End: <strong>{formData.endDate}</strong></span>
          {formData.attendanceId && <span>Att. ID: <strong className="text-blue-600">{formData.attendanceId}</strong></span>}
        </div>
        {isEdit && (
          <p className="text-[11px] text-amber-600 mt-2 font-medium">
            ℹ️ Only newly uploaded photos will replace existing ones.
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto">

        <button type="button" onClick={() => navigate("/members")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 text-sm font-medium transition">
          <ArrowLeft size={15} /> Back to Members
        </button>

        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💪</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{isEdit ? "Edit Member" : "New Registration"}</h1>
            <p className="text-gray-400 text-sm mt-1">{isEdit ? "Update member details" : "4 steps to complete"}</p>
          </div>

          {renderStepIndicator()}

          {/* Render step content OUTSIDE the form to prevent any accidental submit */}
          <div className="bg-gray-50 p-5 rounded-xl mb-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>

          {/* Navigation buttons — ALL type="button" EXCEPT the final submit */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
            {step > 1 ? (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition text-sm">
                ← Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm shadow-sm">
                Next Step →
              </button>
            ) : (
              /* This is the ONLY submit trigger — completely outside any <form> tag */
              <button type="button" disabled={isSubmitting} onClick={handleSubmit}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold px-8 py-2.5 rounded-xl transition text-sm shadow-sm">
                {isSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  &nbsp;{isEdit ? "Updating…" : "Registering…"}</>
                ) : (
                  <><Check size={16} /> {isEdit ? "Update Member" : "Complete Registration"}</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Step {step} of 4</p>
      </div>
    </div>
  );
};

export default Register;
