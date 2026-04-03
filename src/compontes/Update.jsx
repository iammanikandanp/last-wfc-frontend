import React, { useState, useEffect } from "react";
import CustomBaseUrl from "../hooks/CustomBaseUrl";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

const Update = () => {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigation = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await CustomBaseUrl.get(
          `/fetchone/${id}`
        );
        setFormData(response.data.data);
        setLoading(false);
        console.log("Fetched user data:", response.data.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
        toast.error("Failed to fetch user data");
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updatedData = { ...prev, [name]: value };

      // BMI calculation
      if (name === "height" || name === "weight") {
        const height = parseFloat(
          name === "height" ? value : updatedData.height
        );
        const weight = parseFloat(
          name === "weight" ? value : updatedData.weight
        );
        updatedData.bmi =
          height > 0 && weight > 0 ? (weight / ((height / 100) ** 2)).toFixed(2) : "";
      }

      // End Date calculation
      if (name === "startDate" || name === "duration") {
        const startDate = updatedData.startDate ? new Date(updatedData.startDate) : null;
        const durationMonths = parseInt(updatedData.duration, 10);
        if (startDate && !isNaN(durationMonths)) {
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + durationMonths);
          const yyyy = endDate.getFullYear();
          const mm = String(endDate.getMonth() + 1).padStart(2, "0");
          const dd = String(endDate.getDate()).padStart(2, "0");
          updatedData.endDate = `${yyyy}-${mm}-${dd}`;
        } else updatedData.endDate = "";
      }

      // Body Fat calculation
      if (["waist", "neck", "hip", "height", "gender"].includes(name)) {
        const gender = updatedData.gender;
        const height = parseFloat(updatedData.height);
        const neck = parseFloat(updatedData.neck);
        const waist = parseFloat(updatedData.waist);
        const hip = parseFloat(updatedData.hip);
        if (
          gender &&
          height > 0 &&
          neck > 0 &&
          waist > 0 &&
          (gender === "Male" || (gender === "Female" && hip > 0))
        ) {
          let bodyFat = 0;
          if (gender === "Male") {
            bodyFat =
              495 /
                (1.0324 -
                  0.19077 * Math.log10(waist - neck) +
                  0.15456 * Math.log10(height)) -
              450;
          } else if (gender === "Female") {
            bodyFat =
              495 /
                (1.29579 -
                  0.35004 * Math.log10(waist + hip - neck) +
                  0.221 * Math.log10(height)) -
              450;
          }
          updatedData.bodyFat = bodyFat.toFixed(2);
        } else updatedData.bodyFat = "";
      }

      return updatedData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await CustomBaseUrl.post(
        `/update/${formData._id}`,
        formData
      );

      toast.success(response.data.message);
      navigation("/");
      console.log(response.data);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Update failed. Please check the console.");
    }
  };

  if (loading || !formData) return <div className="text-center mt-10 text-lg">Loading user data...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white shadow-lg rounded-2xl">
      <Toaster />
      <h2 className="text-2xl font-bold mb-6">Update User Information</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[ 
          { label: "Name", name: "name" },
          { label: "Age", name: "age" },
          { label: "Gender", name: "gender" },
          { label: "Email", name: "emails", type: "email" },
          { label: "Height", name: "height" },
          { label: "Weight", name: "weight" },
          { label: "BMI", name: "bmi", readOnly: true },
          { label: "Waist", name: "waist" },
          { label: "Neck", name: "neck" },
          { label: "Body Fat", name: "bodyFat", readOnly: true },
          { label: "Start Date", name: "startDate", type: "date" },
          { label: "End Date", name: "endDate", type: "date", readOnly: true },
          { label: "Phone", name: "phone" },
          { label: "Address", name: "address" },
          { label: "Pincode", name: "pincode" },
        ].map(({ label, name, type = "text", readOnly = false }) => (
          <div key={name} className="flex flex-col">
            <label className="mb-1 font-medium">{label}</label>
            <input
              type={type}
              name={name}
              value={type === "date" && formData[name] ? formData[name].slice(0, 10) : formData[name] || ""}
              onChange={handleChange}
              readOnly={readOnly}
              className={`border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${readOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
            />
          </div>
        ))}

        {formData.gender === "Female" && (
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Hip</label>
            <input
              type="text"
              name="hip"
              value={formData.hip || ""}
              onChange={handleChange}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        <div className="col-span-2 flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Update
          </button>
        </div>
      </form>
    </div>
  );
};

export default Update;

