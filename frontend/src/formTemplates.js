// Government Scheme Form Templates
// This file contains templates for various government schemes with field mappings

export const formTemplates = {
  ayushman_bharat: {
    name: "Ayushman Bharat - PM-JAY",
    description: "Health insurance scheme for economically vulnerable families",
    fields: {
      applicant_name: { label: "आवेदक का नाम", type: "text", required: true },
      age: { label: "आयु", type: "number", required: true },
      gender: { label: "लिंग", type: "select", options: ["पुरुष", "महिला", "अन्य"], required: true },
      village: { label: "गाँव/शहर", type: "text", required: true },
      district: { label: "जिला", type: "text", required: true },
      state: { label: "राज्य", type: "text", required: true },
      aadhar_number: { label: "आधार नंबर", type: "text", required: true },
      family_income: { label: "परिवार की वार्षिक आय", type: "text", required: true },
      bpl_status: { label: "बीपीएल कार्ड", type: "select", options: ["हाँ", "नहीं"], required: true },
      family_members: { label: "परिवार के सदस्यों की संख्या", type: "number", required: true },
      occupation: { label: "व्यवसाय", type: "text", required: false },
      contact_number: { label: "संपर्क नंबर", type: "text", required: true },
      bank_account: { label: "बैंक खाता नंबर", type: "text", required: true },
      ifsc_code: { label: "IFSC कोड", type: "text", required: true }
    },
    patientMapping: {
      applicant_name: "name",
      age: "age",
      gender: "gender",
      village: "village",
      aadhar_number: "aadharNumber",
      family_income: "income",
      bpl_status: "bplCard",
      family_members: "familyMembers"
    }
  },

  pm_kisan: {
    name: "PM-KISAN",
    description: "Direct income support to farmers",
    fields: {
      farmer_name: { label: "किसान का नाम", type: "text", required: true },
      age: { label: "आयु", type: "number", required: true },
      gender: { label: "लिंग", type: "select", options: ["पुरुष", "महिला", "अन्य"], required: true },
      village: { label: "गाँव", type: "text", required: true },
      district: { label: "जिला", type: "text", required: true },
      state: { label: "राज्य", type: "text", required: true },
      aadhar_number: { label: "आधार नंबर", type: "text", required: true },
      land_holding: { label: "जमीन का आकार (हेक्टेयर)", type: "number", required: true },
      bank_account: { label: "बैंक खाता नंबर", type: "text", required: true },
      ifsc_code: { label: "IFSC कोड", type: "text", required: true },
      contact_number: { label: "संपर्क नंबर", type: "text", required: true },
      family_members: { label: "परिवार के सदस्य", type: "number", required: true }
    },
    patientMapping: {
      farmer_name: "name",
      age: "age",
      gender: "gender",
      village: "village",
      aadhar_number: "aadharNumber",
      family_members: "familyMembers"
    }
  },

  ujjwala_yojana: {
    name: "PM Ujjwala Yojana",
    description: "LPG connection for women from BPL households",
    fields: {
      woman_name: { label: "महिला का नाम", type: "text", required: true },
      age: { label: "आयु", type: "number", required: true },
      husband_name: { label: "पति का नाम", type: "text", required: true },
      village: { label: "गाँव", type: "text", required: true },
      district: { label: "जिला", type: "text", required: true },
      state: { label: "राज्य", type: "text", required: true },
      aadhar_number: { label: "आधार नंबर", type: "text", required: true },
      bpl_status: { label: "बीपीएल कार्ड", type: "select", options: ["हाँ", "नहीं"], required: true },
      family_income: { label: "परिवार की आय", type: "text", required: true },
      contact_number: { label: "संपर्क नंबर", type: "text", required: true },
      bank_account: { label: "बैंक खाता नंबर", type: "text", required: true },
      ifsc_code: { label: "IFSC कोड", type: "text", required: true }
    },
    patientMapping: {
      woman_name: "name",
      age: "age",
      village: "village",
      aadhar_number: "aadharNumber",
      bpl_status: "bplCard",
      family_income: "income"
    }
  },

  pm_awas_yojana: {
    name: "PM Awas Yojana",
    description: "Housing for All scheme",
    fields: {
      applicant_name: { label: "आवेदक का नाम", type: "text", required: true },
      age: { label: "आयु", type: "number", required: true },
      gender: { label: "लिंग", type: "select", options: ["पुरुष", "महिला", "अन्य"], required: true },
      village: { label: "गाँव", type: "text", required: true },
      district: { label: "जिला", type: "text", required: true },
      state: { label: "राज्य", type: "text", required: true },
      aadhar_number: { label: "आधार नंबर", type: "text", required: true },
      family_income: { label: "परिवार की आय", type: "text", required: true },
      bpl_status: { label: "बीपीएल कार्ड", type: "select", options: ["हाँ", "नहीं"], required: true },
      family_members: { label: "परिवार के सदस्य", type: "number", required: true },
      current_housing: { label: "वर्तमान आवास की स्थिति", type: "select", options: ["कच्चा घर", "झोपड़ी", "किराए का घर", "अन्य"], required: true },
      contact_number: { label: "संपर्क नंबर", type: "text", required: true },
      bank_account: { label: "बैंक खाता नंबर", type: "text", required: true },
      ifsc_code: { label: "IFSC कोड", type: "text", required: true }
    },
    patientMapping: {
      applicant_name: "name",
      age: "age",
      gender: "gender",
      village: "village",
      aadhar_number: "aadharNumber",
      family_income: "income",
      bpl_status: "bplCard",
      family_members: "familyMembers"
    }
  },

  jan_aushadhi: {
    name: "PM Jan Aushadhi",
    description: "Affordable generic medicines",
    fields: {
      patient_name: { label: "रोगी का नाम", type: "text", required: true },
      age: { label: "आयु", type: "number", required: true },
      gender: { label: "लिंग", type: "select", options: ["पुरुष", "महिला", "अन्य"], required: true },
      village: { label: "गाँव", type: "text", required: true },
      aadhar_number: { label: "आधार नंबर", type: "text", required: true },
      medical_condition: { label: "चिकित्सीय स्थिति", type: "text", required: true },
      current_medicines: { label: "वर्तमान दवाएं", type: "text", required: false },
      family_income: { label: "परिवार की आय", type: "text", required: true },
      contact_number: { label: "संपर्क नंबर", type: "text", required: true }
    },
    patientMapping: {
      patient_name: "name",
      age: "age",
      gender: "gender",
      village: "village",
      aadhar_number: "aadharNumber",
      medical_condition: "symptom",
      family_income: "income"
    }
  }
};

// Helper function to get available schemes
export const getAvailableSchemes = () => {
  return Object.keys(formTemplates).map(key => ({
    key,
    name: formTemplates[key].name,
    description: formTemplates[key].description
  }));
};

// Helper function to get form template by key
export const getFormTemplate = (schemeKey) => {
  return formTemplates[schemeKey] || null;
};

// Helper function to map patient data to form fields
export const mapPatientToForm = (patientData, schemeKey) => {
  const template = formTemplates[schemeKey];
  if (!template) return null;

  const mappedData = {};
  const mapping = template.patientMapping;

  // Map existing patient data
  Object.keys(mapping).forEach(formField => {
    const patientField = mapping[formField];
    mappedData[formField] = patientData[patientField] || '';
  });

  // Add default values for required fields that don't have patient data
  Object.keys(template.fields).forEach(fieldKey => {
    if (template.fields[fieldKey].required && !mappedData[fieldKey]) {
      if (template.fields[fieldKey].type === 'select') {
        mappedData[fieldKey] = template.fields[fieldKey].options[0] || '';
      } else {
        mappedData[fieldKey] = '';
      }
    }
  });

  return mappedData;
}; 