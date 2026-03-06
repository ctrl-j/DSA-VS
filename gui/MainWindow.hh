#ifndef MAINWINDOW_HH
#define MAINWINDOW_HH

#include <QMainWindow>

class PageStack;

class MainWindow : public QMainWindow
{
    Q_OBJECT
public:
    MainWindow(QWidget *parent = nullptr);

    PageStack *CW;
};

#endif // MAINWINDOW_HH
