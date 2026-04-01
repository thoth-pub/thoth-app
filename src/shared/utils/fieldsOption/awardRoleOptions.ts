import { AwardRoles } from '../../constants/awards';

export const awardRoleOptions = [
  { value: AwardRoles.enum.Commended, label: 'commended' },
  { value: AwardRoles.enum.JointWinner, label: 'joint winner' },
  { value: AwardRoles.enum.LongListed, label: 'long listed' },
  { value: AwardRoles.enum.Nominated, label: 'nominated' },
  { value: AwardRoles.enum.RunnerUp, label: 'runner up' },
  { value: AwardRoles.enum.ShortListed, label: 'short listed' },
  { value: AwardRoles.enum.Winner, label: 'winner' },
];
