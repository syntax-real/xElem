import { useWindowsStore } from '../../Store/windowsStore';
import Window from './Window';

const WindowsRenderer = () => {
    const windows = useWindowsStore(state => state.windows);
    return (
        <>
            {windows.map(win => (
                <Window key={win.id} title={win.title} win={win} />
            ))}
        </>
    );
};

export default WindowsRenderer;
