#ifndef BUGREPORTDIALOG_H
#define BUGREPORTDIALOG_H

#include <QDialog>
#include <QCheckBox>
#include <QTextEdit>
#include <QVBoxLayout>
#include <QDialogButtonBox>
#include <QPushButton>



class bugReportDialog : public QDialog
{
    Q_OBJECT

public:
    explicit bugReportDialog(QWidget *parent = nullptr);
    ~bugReportDialog();
private slots:
    void checkSelection();
private:
    QCheckBox *instructionConfuse;
    QCheckBox *brokenTest;
    QCheckBox *uiProblem;
    QTextEdit *textBox;
    QDialogButtonBox *confirm;
};

#endif // BUGREPORTDIALOG_H
