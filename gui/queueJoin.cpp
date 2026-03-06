#include "queueJoin.h"

queueJoin::queueJoin(const QString &authToken, QWidget *parent)
    : QDialog(parent), authToken(authToken)
{
    setWindowTitle("Find a Match");
    resize(800,600);
    // Add these two lines
    network = new QNetworkAccessManager(this);
    pollTimer = new QTimer(this);
    pollTimer->setInterval(3000);
    connect(pollTimer, &QTimer::timeout, this, &queueJoin::queueStatus);
    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->setContentsMargins(40, 40, 40, 40);

    // Top two thirds — status label centered
    QWidget *topSection = new QWidget(this);
    QVBoxLayout *topLayout = new QVBoxLayout(topSection);

    lblStatus = new QLabel("Join a Queue", this);
    QFont titleFont = lblStatus->font();
    titleFont.setPointSize(36);
    titleFont.setBold(true);
    lblStatus->setFont(titleFont);
    lblStatus->setAlignment(Qt::AlignCenter);

    topLayout->addStretch(1);
    topLayout->addWidget(lblStatus, 0, Qt::AlignCenter);
    topLayout->addStretch(1);

    // Bottom third — ranked and ffa buttons
    QWidget *bottomSection = new QWidget(this);
    QHBoxLayout *btnLayout = new QHBoxLayout(bottomSection);
    btnLayout->setSpacing(20);

    btnRanked = new QPushButton("Ranked", this);
    btnFFA    = new QPushButton("FFA", this);

    // Make buttons tall and wide
    btnRanked->setMinimumHeight(80);
    btnFFA->setMinimumHeight(80);
    QFont btnFont = btnRanked->font();
    btnFont.setPointSize(18);
    btnRanked->setFont(btnFont);
    btnFFA->setFont(btnFont);

    btnLayout->addWidget(btnRanked);
    btnLayout->addWidget(btnFFA);

    btnCancel = new QPushButton("✖ Leave Queue", this);
    btnCancel->setVisible(false);
    btnCancel->setStyleSheet("color: red; font-size: 16px;");
    btnCancel->setMinimumHeight(50);

    // Stack top (2/3) and bottom (1/3) sections
    layout->addWidget(topSection, 2);     // takes 2 parts
    layout->addWidget(bottomSection, 1); // takes 1 part
    layout->addWidget(btnCancel, 0, Qt::AlignCenter);

    connect(btnRanked, &QPushButton::clicked, this, &queueJoin::joinRanked);
    connect(btnFFA,    &QPushButton::clicked, this, &queueJoin::joinFFA);
    connect(btnCancel, &QPushButton::clicked, this, &queueJoin::leaveQueue);
}

queueJoin::~queueJoin(){}

void queueJoin::joinRanked() { joinQueue("ranked"); }
void queueJoin::joinFFA()    { joinQueue("ffa"); }

void queueJoin::joinQueue(const QString &mode)
{
    QNetworkRequest request(QUrl("http://localhost:3000/api/queue/join"));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setRawHeader("Authorization", "Bearer " + authToken.toUtf8());

    QJsonObject body;
    body["mode"] = mode;
    QJsonDocument doc(body);

    QNetworkReply *reply = network->post(request, doc.toJson());

    connect(reply, &QNetworkReply::finished, this, [reply, mode, this]() {
        if (reply->error() == QNetworkReply::NoError) {
            setJoined(mode);
        } else {
            lblStatus->setText("Failed to join queue. Try again.");
        }
        reply->deleteLater();
    });
}

void queueJoin::leaveQueue()
{
    QNetworkRequest request(QUrl("http://localhost:3000/api/queue/leave"));
    request.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
    request.setRawHeader("Authorization", "Bearer " + authToken.toUtf8());

    QNetworkReply *reply = network->post(request, QByteArray("{}"));

    connect(reply, &QNetworkReply::finished, this, [reply, this]() {
        if (reply->error() == QNetworkReply::NoError) {
            setIdle();
        }
        reply->deleteLater();
    });
}

void queueJoin::queueStatus()
{
    QNetworkRequest request(QUrl("http://localhost:3000/api/queue/status"));
    request.setRawHeader("Authorization", "Bearer " + authToken.toUtf8());

    QNetworkReply *reply = network->get(request);

    connect(reply, &QNetworkReply::finished, this, [reply, this]() {
        if (reply->error() == QNetworkReply::NoError) {
            QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
            QJsonObject obj = doc.object();

            bool queued = obj["queued"].toBool();

            if (!queued) {
                // Match found — server removed us from queue
                pollTimer->stop();
                lblStatus->setText("✅ Match found! Loading...");
                btnCancel->setVisible(false);
                // here you can emit a signal or open the match window
            } else {
                int position = obj["position"].toInt();
                lblStatus->setText(
                    QString("Searching for %1 match... (Position: %2)")
                        .arg(currentMode).arg(position)
                    );
            }
        }
        reply->deleteLater();
    });
}

void queueJoin::setJoined(const QString &mode)
{
    currentMode = mode;

    // Grey out both join buttons
    btnRanked->setEnabled(false);
    btnFFA->setEnabled(false);

    // Show cancel only for the mode that was joined
    btnCancel->setVisible(true);

    lblStatus->setText(QString("Searching for %1 match...").arg(mode));

    // Start polling for match status
    pollTimer->start();
}

void queueJoin::setIdle()
{
    currentMode = "";
    btnRanked->setEnabled(true);
    btnFFA->setEnabled(true);
    btnCancel->setVisible(false);
    lblStatus->setText("Select a queue to join:");
    pollTimer->stop();
}
