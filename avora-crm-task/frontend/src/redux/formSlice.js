import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: '',
  time: '',
  topics: '',
  sentiment: '',
  actions: ''
};

const formSlice = createSlice({
  name: 'form',
  initialState,
  reducers: {
    updateFormField: (state, action) => {
      state[action.payload.field] = action.payload.value;
    },
    autoFillForm: (state, action) => {
      return { ...state, ...action.payload };
    },
    // NAYA FUNCTION: Form clear karne ke liye
    resetForm: () => initialState
  },
});

export const { updateFormField, autoFillForm, resetForm } = formSlice.actions;
export default formSlice.reducer;