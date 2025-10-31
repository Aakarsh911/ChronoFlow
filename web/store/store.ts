"use client"

import { configureStore, combineReducers } from "@reduxjs/toolkit"
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux"
import storage from "redux-persist/lib/storage"
import { persistReducer, persistStore } from "redux-persist"
import focusTimerReducer from "./focusTimerSlice"

const rootReducer = combineReducers({
  focusTimer: focusTimerReducer,
})

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["focusTimer"],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
