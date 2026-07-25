export function Input({ id, type = "text", placeholder, value, onChange, required, disabled }) {
  return (
    <input 
      id={id}
      className="input-base"
      type={type} 
      placeholder={placeholder} 
      value={value} 
      onChange={onChange}
      required={required}
      disabled={disabled}
    />
  );
}
