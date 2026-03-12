import { describe, expect, it, jest } from "@jest/globals";

import { MailService } from "./mail.service";

describe("MailService reminder overrides", () => {
  it("renders custom reminder html with merged context and custom subject", async () => {
    const sendMail = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const service = new MailService({
      sendMail,
    } as any);

    const result = await service.sendAssessmentReminder(
      "zhangxuan@example.com",
      {
        recipientName: "张轩",
        assessmentTitle: "2026年02月OKR考核",
        period: "2026-02",
        endDate: new Date("2026-03-25T00:00:00.000Z"),
        systemUrl: "https://okr.gerenukagro.com/login",
        pendingItems: [
          {
            participantName: "张轩",
            waitingFor: "员工自评",
          },
        ],
      },
      {
        subject: "[自定义] OKR 提醒",
        html: "<div>{{recipientName}} / {{customNote}} / {{assessmentTitle}}</div>",
        context: {
          customNote: "请尽快处理",
        },
      }
    );

    expect(result).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "zhangxuan@example.com",
        subject: "[自定义] OKR 提醒",
        html: "<div>张轩 / 请尽快处理 / 2026年02月OKR考核</div>",
      })
    );
  });
});
