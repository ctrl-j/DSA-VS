#ifndef QUEUEJOIN_H
#define QUEUEJOIN_H

#include <QDialog>
#include <QLabel>
#include <QPushButton>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QNetworkAccessManager>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QJsonObject>
#include <QJsonDocument>
#include <QTimer>

class queueJoin : public QDialog
{
    Q_OBJECT

public:
    explicit queueJoin(const QString &authToken, QWidget *parent = nullptr);
    ~queueJoin();

private slots:
    void joinRanked();
    void joinFFA();
    void leaveQueue();
    void queueStatus();
private:
    void joinQueue(const QString &mode);
    void setJoined(const QString &mode);
    void setIdle();

    QString authToken;
    QString currentMode;

    QLabel *lblStatus;
    QPushButton *btnRanked;
    QPushButton *btnFFA;
    QPushButton *btnCancel;

    QNetworkAccessManager *network;
    QTimer *pollTimer;
};

#endif // QUEUEJOIN_H
