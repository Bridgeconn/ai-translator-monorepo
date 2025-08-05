function Login() {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Login</h2>
        <form>
          <input placeholder="Email" /><br />
          <input placeholder="Password" type="password" /><br />
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }
  
  export default Login;
  