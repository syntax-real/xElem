import { I_BACK } from '../../../System/UI/IconPack';
import { memo } from 'react';

const BackButton = ({ onClick, style }: any) => {
    return (
        <button onClick={onClick} style={style} className="UI-Bubble UI-BackButton">
            <I_BACK /> 
        </button>
    ) 
}

export default memo(BackButton);