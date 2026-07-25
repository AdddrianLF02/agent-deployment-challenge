export function Button({ type = "button", children, onClick, disabled }) {
  return (
    <button className="btn-primary" type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
