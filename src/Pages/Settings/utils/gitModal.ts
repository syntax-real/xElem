import AddLink from '../pages/AddLink';
import AdvancedSettings from '../pages/AdvancedSettings';
import Authors from '../pages/Authors';
import ChangeEmail from '../pages/ChangeEmail';
import ChangeLanguage from '../pages/ChangeLanguage';
import ChangePassword from '../pages/ChangePassword';
import ChangeUsername from '../pages/ChangeUsername';
import EditLink from '../pages/EditLink';
import Sessions from '../pages/Sessions';
import Status from '../pages/Status';
import Storage from '../pages/Storage';
import MyReports from '../pages/MyReports';
import SubmitAppealModal from '../pages/SubmitAppealModal';
import MyAppealsListModal from '../pages/MyAppealsListModal';
import DeleteAccount from '../pages/DeleteAccount';

const getModal = (type) => {
    const map = {
        add_link: AddLink,
        edit_link: EditLink,
        change_username: ChangeUsername,
        change_password: ChangePassword,
        change_email: ChangeEmail,
        sessions: Sessions,
        change_language: ChangeLanguage,
        authors: Authors,
        profile_status: Status,
        storage: Storage,
        my_reports: MyReports,
        advanced: AdvancedSettings,
        submit_appeal: SubmitAppealModal,
        my_appeals: MyAppealsListModal,
        delete_account: DeleteAccount
    };

    return map[type] || null;
};

export default getModal;
