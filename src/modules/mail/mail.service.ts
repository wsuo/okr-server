import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface AssessmentNotificationData {
  userName: string;
  assessmentTitle: string;
  period: string;
  endDate?: Date;
  systemUrl: string;
}

export interface AssessmentReminderItem {
  participantName: string;
  waitingFor: string;
}

export interface AssessmentReminderData {
  recipientName: string;
  assessmentTitle: string;
  period: string;
  endDate?: Date;
  systemUrl: string;
  pendingItems: AssessmentReminderItem[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendAssessmentNotification(
    email: string,
    data: AssessmentNotificationData,
  ): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `[OKR系统] 考核通知 - ${data.assessmentTitle}`,
        template: 'assessment-notification',
        context: {
          userName: data.userName,
          assessmentTitle: data.assessmentTitle,
          period: data.period,
          endDate: data.endDate,
          systemUrl: data.systemUrl,
        },
      });

      this.logger.log(`考核通知邮件发送成功: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `考核通知邮件发送失败: ${email}`,
        error.stack,
      );
      return false;
    }
  }

  async sendBulkAssessmentNotifications(
    participants: Array<{ email: string; name: string }>,
    data: Omit<AssessmentNotificationData, 'userName'>,
  ): Promise<void> {
    const promises = participants
      .filter(p => p.email) // 过滤掉没有邮箱的用户
      .map(participant =>
        this.sendAssessmentNotification(participant.email, {
          ...data,
          userName: participant.name,
        })
      );

    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    this.logger.log(
      `批量发送考核通知邮件完成: 成功 ${successCount} 个, 失败 ${failureCount} 个`
    );
  }

  async sendAssessmentReminder(
    email: string,
    data: AssessmentReminderData,
  ): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `[OKR系统] 提交提醒 - ${data.assessmentTitle}`,
        template: "assessment-reminder",
        context: {
          recipientName: data.recipientName,
          assessmentTitle: data.assessmentTitle,
          period: data.period,
          endDate: data.endDate,
          systemUrl: data.systemUrl,
          pendingItems: data.pendingItems,
        },
      });

      this.logger.log(`考核提醒邮件发送成功: ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `考核提醒邮件发送失败: ${email}`,
        error.stack,
      );
      return false;
    }
  }

  async sendBulkAssessmentReminders(
    recipients: Array<{
      email: string;
      name: string;
      pendingItems: AssessmentReminderItem[];
    }>,
    data: Omit<AssessmentReminderData, "recipientName" | "pendingItems">,
  ): Promise<void> {
    const promises = recipients
      .filter((recipient) => recipient.email)
      .map((recipient) =>
        this.sendAssessmentReminder(recipient.email, {
          ...data,
          recipientName: recipient.name,
          pendingItems: recipient.pendingItems,
        })
      );

    const results = await Promise.allSettled(promises);

    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = results.filter((result) => result.status === "rejected").length;

    this.logger.log(
      `批量发送考核提醒邮件完成: 成功 ${successCount} 个, 失败 ${failureCount} 个`
    );
  }
}
