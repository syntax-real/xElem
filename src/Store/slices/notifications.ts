import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Notification = {
    id: string;
};

type NotificationsState = {
    list: Notification[];
};

const initialState: NotificationsState = {
    list: []
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification(state, action: PayloadAction<Notification>) {
            state.list.push(action.payload);
        },
        removeNotification(state, action: PayloadAction<string>) {
            state.list = state.list.filter(n => n.id !== action.payload);
        }
    }
});

export const { addNotification, removeNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;