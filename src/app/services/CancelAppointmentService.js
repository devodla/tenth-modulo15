import { isBefore, subHours } from 'date-fns';

import Queue from '../../lib/Queue';
import Cache from '../../lib/Cache';

import CancellationMail from '../jobs/CancellationMail';

import User from '../models/User';
import Appointment from '../models/Appointment';

class CancelAppointmentService {
  async run({ provider_id, userId }) {
    const appointment = await Appointment.findByPk(provider_id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== userId) {
      throw new Error("You don't have permission to cancel this appointment.");
    }

    const dateWithSub = subHours(appointment.date, 2);
    const dateAtual = new Date();

    if (isBefore(dateWithSub, dateAtual)) {
      throw new Error('You can only cancel appointment 2 hours in advance.');
    }

    appointment.canceled_at = dateAtual;

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    /**
     * Invalidate cache
     */
    await Cache.invalidatePrefix(`user:${userId}:appointments`);

    return appointment;
  }
}

export default new CancelAppointmentService();
