function InputFeild({ handleSubmit, disabled }) {
  return (
    <div className="input-container">
      <input
        type="text"
        placeholder="Ask Anything"
        className="input-feild"
        onKeyDown={handleSubmit}
        disabled={disabled}
      />
    </div>
  );
}
export default InputFeild;
