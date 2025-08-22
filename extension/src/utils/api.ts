export const checkServerStatus = async (backendHttpUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${backendHttpUrl.replace('/upload', '')}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};
