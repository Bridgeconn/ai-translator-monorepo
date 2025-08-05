function Register() {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Register</h2>
        <form>
          <input placeholder="Name" /><br />
          <input placeholder="Email" /><br />
          <input placeholder="Password" type="password" /><br />
          <button type="submit">Register</button>
        </form>
      </div>
    );
  }
  
  export default Register;
  