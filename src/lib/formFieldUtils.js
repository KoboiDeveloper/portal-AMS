export const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const formatPhoneGroups = (digits) => {
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length <= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
};

export const stripPhoneMask = (value) => String(value || "").replace(/\D/g, "");

export const applyFieldMask = (maskType, rawValue) => {
  if (rawValue == null) return "";

  switch (maskType) {
    case "code":
      return String(rawValue).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
    case "phone": {
      let digits = String(rawValue).replace(/\D/g, "").slice(0, 15);
      if (!digits) return "";
      if (digits.startsWith("62")) {
        digits = `0${digits.slice(2)}`;
      }
      return formatPhoneGroups(digits);
    }
    case "name":
      return String(rawValue).replace(/[^a-zA-Z0-9\s.'-]/g, "").slice(0, 100);
    default:
      return rawValue;
  }
};

export const validateFieldValue = (field, value) => {
  const str = value == null ? "" : String(value).trim();

  if (field.required && field.type !== "checkbox" && !str) {
    return `${field.label} is required`;
  }

  if (field.validate === "email" && str && !EMAIL_PATTERN.test(str)) {
    return "Invalid email address";
  }

  if (field.validate === "phone" && str) {
    const digits = stripPhoneMask(str);
    const normalized = digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
    if (normalized.length < 10 || normalized.length > 13) {
      return "Phone number must be 10-13 digits";
    }
    if (!/^08[1-9][0-9]{7,10}$/.test(normalized)) {
      return "Invalid Indonesian mobile number (08xx)";
    }
  }

  if (field.minLength && str.length < field.minLength) {
    return `${field.label} minimum ${field.minLength} characters`;
  }

  return "";
};

export const validateFormFields = (fields, formData) => {
  const errors = {};
  fields.forEach((field) => {
    const message = validateFieldValue(field, formData[field.name]);
    if (message) errors[field.name] = message;
  });
  return errors;
};

export const normalizeFormPayload = (fields, formData) => {
  const payload = { ...formData };
  fields.forEach((field) => {
    const value = payload[field.name];
    if (value == null || value === "") return;

    if (field.mask === "phone") {
      payload[field.name] = stripPhoneMask(value);
    } else if (field.mask === "code") {
      payload[field.name] = String(value).trim().toUpperCase();
    } else if (field.validate === "email") {
      payload[field.name] = String(value).trim().toLowerCase();
    } else if (field.mask === "name") {
      payload[field.name] = String(value).trim();
    }
  });
  return payload;
};
