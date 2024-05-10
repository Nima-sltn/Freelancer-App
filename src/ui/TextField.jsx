function TextField({ label, value, name, onChange }) {
  return (
    <div>
      <label className="mb-2 block" htmlFor={name}>
        {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        id={name}
        name={name}
        className="textField__input"
        type="text"
        autoComplete="off"
      />
    </div>
  );
}

export default TextField;
