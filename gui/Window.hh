#ifndef WINDOW_HH
#define WINDOW_HH

#include <QMainWindow>
#include <QVBoxLayout>
#include <QSplitter>
#include <QTextEdit>
#include <QLabel>
#include <QPushButton>
#include <QLineEdit>
#include <QScrollArea>

enum UI_STATUS {
    OK = 0,
    FAIL = 1,
    ERR_INIT = 2,
    ERR_DATA = 3,
    ERR_INTERNAL = 4
};

// TODO:
//      create new class for Editor pane
//      create new class for Problem pane
//      move old code into those classes
//      create references to them from inside Window
class Window : public QMainWindow
{
    Q_OBJECT
private:
    QWidget *CW;
    QVBoxLayout *lytMain;

    QWidget *tbMainTools;
    QHBoxLayout *tbMainLayout;

    QSplitter *splitter;

    // Contains all the contents of the editor
    QWidget *editorContainer;
    // Layout for the container
    QVBoxLayout *lytEditor;
    // Toolbar for text editing controls (undo, redo, etc)
    QToolBar *tbEditorTools;
    // Text input zone
    QTextEdit *tedEditor;
    // Layout + labels for info at bottom of editor
    QHBoxLayout *lytEditorInfo;
    QLabel *lblEditorInfo1;
    QLabel *lblEditorInfo2;

    QWidget *problemContainer;
    QVBoxLayout *lytProblem;
    QToolBar *tbProblemTools;
    QLabel *lblProblem;
    QTextDocument *docProblem;
    QScrollArea *scrollerProblem;

public:
    UI_STATUS status;

    Window(QWidget *parent = nullptr);
    ~Window();

    // Allocate memory for the GUI elements
    void allocContents();

    //
    void setContents();
    UI_STATUS setProblemPane();
    UI_STATUS setEditorPane();

    void setMainToolbar();
    void setProblemToolbar();
    void setEditorToolbar();

};
#endif // WINDOW_HH
