#ifndef MAINWINDOW_HH
#define MAINWINDOW_HH

#include <QMainWindow>

class PageStack;

class MainWindow : public QMainWindow
{
public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

    PageStack *CW;
};

#endif // MAINWINDOW_HH
