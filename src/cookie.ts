'use client'

import Cookies from 'js-cookie';

export const setAccessToken = (access_token : any) => {
  try {
    Cookies.set('token', access_token, {
      expires: 7,
      path: '/',
      sameSite: 'Lax',
      secure: false
    }); 
    return true;
  } catch (error) {
    console.error('Failed to set access token:', error);
    return false;
  }
};

export const removeAccessToken = () => {
  try {
    Cookies.remove('token',{
      path: '/',
    }); 
    return true;
  } catch (error) {
    console.error('Failed to remove access token:', error);
    return false;
  }
};

export const setEjentoAccessToken = (ejento_access_token : any) => {
  try {
    Cookies.set('ejento_access_token',ejento_access_token, {
      expires: 7,
      path: '/',
      sameSite: 'Lax',
      secure: false
    }); 
    return true;
  } catch (error) {
    console.error('Failed to set access ejento token:', error);
    return false;
  }
};

export const removeEjentoAccessToken = () => {
  try {
    Cookies.remove('ejento_access_token',{
      path: '/',
    }); 
    return true;
  } catch (error) {
    console.error('Failed to remove ejento access token:', error);
    return false;
  }
};

export const getAccessToken = () => {
  let access_token = Cookies.get('token');
  if (access_token) {
    return access_token
  } else {
    return null
  }
};


export const getEjentoAccessToken = () => {
  let ejento_access_token = Cookies.get('ejento_access_token');
  if (ejento_access_token) {
    return ejento_access_token
  } else {
    return null
  }
};

export const setUserToCookie = (userData: any) => {
  try {
    Cookies.set('user_info', JSON.stringify(userData), {
      expires: 2,
      path: '/',
      sameSite: 'Lax',
      secure: false
    }); 
    return true;
  } catch (error) {
    console.error('Failed to set user data to cookie:', error);
    return false;
  }
};

export const getUserFromCookie = () => {
  const userInfoCookie = Cookies.get('user_info');
  if (userInfoCookie) {
   const user = JSON.parse(userInfoCookie)
    return user
  } else {
    return null;
  }
};

// ============ LOCAL STORAGE FUNCTIONS ============

export const setUserToStorage = (userData: any) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_info', JSON.stringify(userData));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to set user data to localStorage:', error);
    return false;
  }
};

export const getUserFromStorage = () => {
  try {
    if (typeof window !== 'undefined') {
      const userInfoStorage = localStorage.getItem('user_info');
      if (userInfoStorage) {
        const user = JSON.parse(userInfoStorage);
        return user;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get user data from localStorage:', error);
    return null;
  }
};

export const clearUserFromStorage = () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_info');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to clear user data from localStorage:', error);
    return false;
  }
};
