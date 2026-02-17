#include "Window.hh"

#include <QComboBox>
#include <QTextDocument>
#include <QToolBar>
#include <QToolButton>

#include <iostream>


Window::~Window() {

}

Window::Window(QWidget *parent)
    : QMainWindow(parent)
{
    // Starting state is "OK"
    status = OK;

    // Create + set the contents of the window
    allocContents();
    setContents();

    // Window configuration
    resize(QSize(800, 600));
    show();
}

void Window::allocContents() {
    CW = new QWidget();
    lytMain = new QVBoxLayout();

    splitter = new QSplitter();

    editorContainer = new QWidget();
    lytEditor = new QVBoxLayout();
    tbEditorTools = new QToolBar();
    tedEditor = new QTextEdit();
    lytEditorInfo = new QHBoxLayout();
    lblEditorInfo1 = new QLabel("Line: 1, Col: 3");
    lblEditorInfo2 = new QLabel("main.cpp");

    problemContainer = new QWidget();
    lytProblem = new QVBoxLayout(problemContainer);
    tbProblemTools = new QToolBar();
    lblProblem = new QLabel("problem text");
    docProblem = new QTextDocument();
    scrollerProblem = new QScrollArea();
}

void Window::setContents() {
    // Setup toolbar widgets
    setMainToolbar();
    setProblemToolbar();
    setEditorToolbar();

    // Retrieve current problem's text+images, set them in the GUI
    UI_STATUS result = setProblemPane();
    if (result != OK) {
        status = result;
        std::cout << "*** ERROR: failed to setup content for the problem pane ***\n";
        return;
    }

    // Set up the editor pane
    result = setEditorPane();
    if (result != OK) {
        status = result;
        std::cout << "*** ERROR: failed to setup content for the editor pane ***\n";
        return;
    }

    // Add toolbar, splitter to the main layout
    lytMain->addWidget(tbMainTools);
    lytMain->setStretch(0, 0);
    lytMain->addWidget(splitter);
    lytMain->setStretch(1, 10);

    scrollerProblem->setWidgetResizable(true);
    scrollerProblem->setWidget(problemContainer);
    scrollerProblem->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    scrollerProblem->setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);

    // Add widgets to the splitter (editor pane, problem pane)
    splitter->addWidget(scrollerProblem);
    splitter->addWidget(editorContainer);

    QSize splitterSize = splitter->size();
    splitter->setSizes({splitterSize.width() / 2, splitterSize.width() / 2 });

    // Setup the central widget
    CW->setLayout(lytMain);
    setCentralWidget(CW);
}

UI_STATUS Window::setProblemPane() {
    QString problemText =
        "Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\n\
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\n\
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\n\
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.\n\
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos."
        ;

    // Set the contents of the problem pane
    lblProblem->setText(problemText);

    // Allow the label to expand as far as possible with the splitter + window width
    lblProblem->setSizePolicy(QSizePolicy::Ignored, QSizePolicy::Preferred);

    //docProblem->setHtml(problemText);

    // Allow text to wrap as you resize the pane + window
    lblProblem->setWordWrap(true);

    // Add the toolbar to the layout
    lytProblem->addWidget(tbProblemTools);

    // Add the label aligned at the top left corner of the container
    lytProblem->addWidget(lblProblem, 0, Qt::AlignLeft | Qt::AlignTop);

    return OK;
}

UI_STATUS Window::setEditorPane() {
    lytEditor->addWidget(tbEditorTools);
    lytEditor->addWidget(tedEditor);
    lytEditorInfo->addWidget(lblEditorInfo1, Qt::AlignLeft);
    lytEditorInfo->addWidget(lblEditorInfo2, Qt::AlignRight);
    lytEditor->addLayout(lytEditorInfo);
    editorContainer->setLayout(lytEditor);

    // Set font for text editor
    QFont font("Courier New");
    font.setPointSize(12);
    tedEditor->setFont(font);

    return OK;
}

void Window::setMainToolbar() {
    tbMainTools = new QWidget();
    tbMainLayout = new QHBoxLayout(tbMainTools);

    // Button to return to DSA_VS home page
    QPushButton *btnHome = new QPushButton(QIcon::fromTheme(QIcon::ThemeIcon::GoHome), "Home");

    // Button to go to problem list
    QPushButton *btnProblems = new QPushButton("☰ Problems");
    // Label for problem ID + name
    QLabel *lblProblemName = new QLabel("Problem 1A: Fibonacci Sequence");
    QFont fontProblem = lblProblemName->font();
    fontProblem.setPointSize(16);
    fontProblem.setBold(true);
    lblProblemName->setFont(fontProblem);
    // Button to go to leaderboards
    QPushButton *btnLeaderboard = new QPushButton("٭ Leaderboards");
    // Button to go to user
    QPushButton *btnAccount = new QPushButton("👤 Account");

    // Add widgets + actions to the toolbar
    tbMainLayout->addWidget(btnHome, Qt::AlignLeft | Qt::AlignVCenter);
    tbMainLayout->addWidget(btnProblems, Qt::AlignLeft | Qt::AlignVCenter);
    tbMainLayout->addStretch(1);
    tbMainLayout->addWidget(lblProblemName);
    tbMainLayout->addStretch(1);
    tbMainLayout->addWidget(btnLeaderboard, Qt::AlignRight | Qt::AlignVCenter);
    tbMainLayout->addWidget(btnAccount, Qt::AlignRight | Qt::AlignVCenter);


    // Set margins + BG color of the toolbar
    tbMainTools->setStyleSheet("QToolBar { margin: 0px; padding: 0px; background-color:#606060; }");
    tbMainTools->setSizePolicy(QSizePolicy::Minimum, QSizePolicy::Minimum);


    btnHome->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    btnProblems->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    btnLeaderboard->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
    btnAccount->setSizePolicy(QSizePolicy::Fixed, QSizePolicy::Fixed);
}

void Window::setProblemToolbar() {
    // "Zoom Out" button on the problem toolbar
    QAction *actZoomOut = new QAction(QIcon::fromTheme(QIcon::ThemeIcon::ZoomOut), "");
    // "Zoom In" button on the problem toolbar
    QAction *actZoomIn = new QAction(QIcon::fromTheme(QIcon::ThemeIcon::ZoomIn), "");
    // An empty spacer in the toolbar for button alignment
    QWidget *spacer = new QWidget();
    // "Search" button on the problem toolbar
    QAction *actFindText = new QAction(QIcon::fromTheme(QIcon::ThemeIcon::EditFind), "");

    // Setup spacer so the zoom in/out are on the left, and search is on the right
    spacer->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);

    // Set margins + BG color of the toolbar
    tbProblemTools->setStyleSheet("QToolBar { margin: 0px; padding: 0px; background-color:#606060; }");

    tbProblemTools->addAction(actZoomOut);
    tbProblemTools->addAction(actZoomIn);
    tbProblemTools->addWidget(spacer);
    tbProblemTools->addAction(actFindText);
}

void Window::setEditorToolbar() {
    // "Font selection" combo box
    QComboBox *cmbFontSelect = new QComboBox();
    cmbFontSelect->addItem("Courier New");
    // "Font Size -" button on the problem toolbar
    QAction *actFontSizeDown = new QAction("-");
    // "Current font size" button on the toolbar
    QLabel *lblFontSize = new QLabel("12");
    // "Font Size +" button on the problem toolbar
    QAction *actFontSizeUp = new QAction("+");
    // An empty spacer in the toolbar for button alignment
    QWidget *spacer = new QWidget();
    // "Search" button on the problem toolbar
    QAction *actFindText = new QAction(QIcon::fromTheme(QIcon::ThemeIcon::EditFind), "");

    // Setup spacer so the zoom in/out are on the left, and search is on the right
    spacer->setSizePolicy(QSizePolicy::Expanding, QSizePolicy::Preferred);

    // Set margins + BG color of the toolbar
    tbEditorTools->setStyleSheet("QToolBar { margin: 0px; padding: 0px; padding-left: 5px; background-color:#606060; }");

    tbEditorTools->addWidget(cmbFontSelect);
    tbEditorTools->addAction(actFontSizeDown);
    tbEditorTools->addWidget(lblFontSize);
    tbEditorTools->addAction(actFontSizeUp);
    tbEditorTools->addWidget(spacer);
    tbEditorTools->addAction(actFindText);
}




