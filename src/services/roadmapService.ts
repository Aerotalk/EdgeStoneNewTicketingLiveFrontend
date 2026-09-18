import axios from 'axios';
import { API_BASE_URL } from '../config';

const ROADMAP_API_URL = `${API_BASE_URL}/api`;

export const getRoadmapData = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${ROADMAP_API_URL}/roadmap`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching roadmap data:', error);
        throw error;
    }
};
