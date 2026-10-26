import React from "react";
import { Input } from "reactstrap";

const SearchInput = ({ value, onChange, placeholder = "Search..." }) => (
  <Input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="form-control-lg"
  />
);

export default SearchInput;
