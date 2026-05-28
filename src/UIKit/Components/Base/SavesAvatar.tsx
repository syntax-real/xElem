import { I_SAVE } from '../../../System/UI/IconPack';

export const SavesAvatar = ({ size }) => (
  <div className='Avatar SavesAvatar' style={{ width: `${size}px`, height: `${size}px` }}>
    <I_SAVE style={{ width: `${size / 2}px`, height: `${size / 2}px` }} />
  </div>
);

export default SavesAvatar;
