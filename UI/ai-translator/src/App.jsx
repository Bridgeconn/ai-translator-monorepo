import useStore from "./store/useStore";
import ZustandExample from "./ZustandExample";
function App() {
  const bearCount = useStore((state) => state.bearCount);
  const user = useStore((state) => state.user);
  const increaseBearCount = useStore((state) => state.increaseBearCount);
  const fetchUser = useStore((state) => state.fetchUser);

  return (
    <>
      <ZustandExample />
    </>
  );
}

export default App;
