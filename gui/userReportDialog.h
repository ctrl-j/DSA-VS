#ifndef USERREPORTDIALOG_H
#define USERREPORTDIALOG_H

#include <QDialog>
#include <QCheckBox>
#include <QTextEdit>
#include <QVBoxLayout>
#include <QDialogButtonBox>
#include <QPushButton>


class OptionsDialog : public QDialog
{
    Q_OBJECT

public:
    explicit OptionsDialog(QWidget *parent = nullptr);
    ~OptionsDialog();
    bool isCheatingChecked() const { return cheating->isChecked(); }
    bool isLeftGameChecked() const { return leftGame->isChecked(); }
    bool isChatAbuseChecked() const { return chatAbuse->isChecked(); }
    bool isOffensiveNameChecked() const { return offensiveName->isChecked(); }
private slots:
    void checkSelection();
private:
    QCheckBox *cheating;
    QCheckBox *leftGame;
    QCheckBox *chatAbuse;
    QCheckBox *offensiveName;
    QTextEdit *textBox;
    QDialogButtonBox *confirm;
};

#endif // USERREPORTDIALOG_H
