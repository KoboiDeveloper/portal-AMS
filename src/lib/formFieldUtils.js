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
    case "year":
      return String(rawValue).replace(/\D/g, "").slice(0, 4);
    case "digits":
      return String(rawValue).replace(/\D/g, "");
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

  if ((field.validate === "year" || field.mask === "year") && str) {
    if (!/^\d{4}$/.test(str)) {
      return `${field.label} harus 4 digit tahun`;
    }
    const y = Number(str);
    const maxY = new Date().getFullYear() + 5;
    if (y < 1990 || y > maxY) {
      return `${field.label} tidak valid (${1990}–${maxY})`;
    }
  }

  if (
    (field.validate === "percent" ||
      field.format === "percent" ||
      field.mask === "percent" ||
      field.type === "percent") &&
    str
  ) {
    const n = Number(String(str).replace(",", "."));
    const maxPct = field.max != null ? Number(field.max) : 100;
    const minPct = field.min != null ? Number(field.min) : 0;
    if (!Number.isFinite(n)) {
      return `${field.label} harus angka`;
    }
    if (n < minPct || n > maxPct) {
      return `${field.label} harus ${minPct}–${maxPct}`;
    }
  }

  return "";
};

export const validateFormFields = (fields, formData) => {
  const errors = {};
  fields.forEach((field) => {
    if (
      field.type === "hidden" ||
      field.hidden ||
      field.type === "display" ||
      field.type === "label" ||
      field.type === "html_preview"
    ) {
      return;
    }
    const message = validateFieldValue(field, formData[field.name]);
    if (message) errors[field.name] = message;
  });
  return errors;
};

export const isCheckboxOn = (value) =>
  value === true || value === 1 || value === "1" || value === "true" || value === "Y" || value === "y";

export const normalizeFormPayload = (fields, formData) => {
  const payload = { ...formData };
  fields.forEach((field) => {
    if (field.type === "html_preview" || field.type === "display" || field.type === "label") {
      delete payload[field.name];
      return;
    }
    const value = payload[field.name];

    if (field.type === "checkbox") {
      payload[field.name] = isCheckboxOn(value) ? "1" : "0";
      return;
    }

    if (value == null || value === "") return;

    if (field.mask === "phone") {
      payload[field.name] = stripPhoneMask(value);
    } else if (field.mask === "code") {
      payload[field.name] = String(value).trim().toUpperCase();
    } else if (field.validate === "email") {
      payload[field.name] = String(value).trim().toLowerCase();
    } else if (field.mask === "name") {
      payload[field.name] = String(value).trim();
    } else if (
      field.format === "currency" ||
      field.mask === "currency" ||
      field.type === "currency"
    ) {
      /* simpan angka polos (tanpa pemisah) */
      payload[field.name] = String(value).replace(/[^\d.]/g, "").replace(/,/g, "");
    } else if (
      field.format === "percent" ||
      field.mask === "percent" ||
      field.type === "percent" ||
      field.validate === "percent"
    ) {
      const n = Number(String(value).replace(",", "."));
      payload[field.name] = Number.isFinite(n) ? String(n) : "";
    }
  });
  return payload;
};
