import useStore from "./store/useStore";

function ZustandExample() {
  const bearCount = useStore((state) => state.bearCount);
  const user = useStore((state) => state.user);
  const increaseBearCount = useStore((state) => state.increaseBearCount);
  const fetchUser = useStore((state) => state.fetchUser);

  return (
    <>
      <h1 className="text-3xl font-bold">Hello world!</h1>
      <h2 className="text-2xl">Bear Count: {bearCount}</h2>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={increaseBearCount}
      >
        Increase Bear Count
      </button>
      <button
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        onClick={() => fetchUser()}
      >
        Fetch User
      </button>
      {user && (
        <ul className="list-disc pl-4 mt-4">
          {user.map((user, index) => (
            <li key={index}>
              <p>Name: {user.name}</p>
              <p>Email: {user.email}</p>
            </li>
          ))}
        </ul>
        
      )}
    </>
  );
}

export default ZustandExample;
