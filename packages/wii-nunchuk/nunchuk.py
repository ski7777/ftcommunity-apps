#! /usr/bin/env python3
# -*- coding: utf-8 -*-
#

import sys
from TouchStyle import *
import smbus
import time


class Axes2dWidget(QWidget):

    def __init__(self, parent=None):
        super(Axes2dWidget, self).__init__(parent)

        qsp = QSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)
        qsp.setHeightForWidth(True)
        self.setSizePolicy(qsp)

        self.x = 0.0
        self.y = 0.0
        self.color = QColor("#fcce04")
        self.error = False

    def heightForWidth(self, w):
        return w

    def paintEvent(self, event):
        painter = QPainter()
        painter.begin(self)

        painter.setRenderHint(QPainter.Antialiasing)

        if self.error:
            pen = QPen(QColor("#ff0000"))
        else:
            pen = QPen(QColor("lightgrey"))
        pen.setWidth(self.width() / 20)
        painter.setPen(pen)
        painter.drawRect(self.rect())

        pen.setWidth(self.width() / 40)
        pen.setStyle(Qt.DotLine)
        painter.setPen(pen)
        painter.drawLine(QPoint(self.width() / 2, 0), QPoint(self.width() / 2, self.height()))
        painter.drawLine(QPoint(0, self.height() / 2), QPoint(self.width(), self.height() / 2))

        # x and y range from -1 to 1
        x = (self.x + 1) / 2 * self.width()
        y = (self.y + 1) / 2 * self.height()
        r = self.width() / 10

        if self.error:
            pen = QPen(QColor("#fcce04"))
            pen.setWidth(self.width() / 50)
            painter.setPen(pen)
            painter.drawText(QRect(0, 0, self.width(), self.height() * 0.7), Qt.AlignCenter, "Error")
        else:
            pen.setWidth(self.width() / 100)
            pen.setStyle(Qt.SolidLine)
            painter.setPen(pen)
            painter.setBrush(QBrush(self.color))
            painter.drawEllipse(x - r / 2, y - r / 2, r, r)
        painter.end()

    def set(self, x, y, c):
        if x != None:
            self.x = x
        if y != None:
            self.y = y
        if c != None:
            self.color = c
        self.error = False
        self.update()


class ButtonWidget(QWidget):

    def __init__(self, text="", parent=None):
        super(ButtonWidget, self).__init__(parent)

        qsp = QSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred)
        qsp.setHeightForWidth(True)
        self.setSizePolicy(qsp)

        self.state = False
        self.text = text
        self.error = False

    def heightForWidth(self, w):
        return w

    def paintEvent(self, event):
        x = 0
        y = 0
        r = self.width()
        if self.width() > self.height():
            x = (self.width() - self.height()) / 2
            r = self.height()
        if self.width() < self.height():
            y = (self.height() - self.width()) / 2
            r = self.width()

        painter = QPainter()
        painter.begin(self)

        painter.setRenderHint(QPainter.Antialiasing)

        pen = QPen(QColor("lightgrey"))
        pen.setWidth(self.width() / 50)
        painter.setPen(pen)
        if self.error:
            painter.setBrush(QBrush(QColor("#ff0000")))
        elif self.state:
            painter.setBrush(QBrush(QColor("#fcce04")))
        else:
            painter.setBrush(Qt.transparent)
        painter.drawEllipse(QRect(x, y, r, r))

        if self.error:
            pen = QPen(QColor("#fcce04"))
            pen.setWidth(self.width() / 50)
            painter.setPen(pen)
            painter.drawText(QRect(x, y, r, r), Qt.AlignCenter, "Error")
        else:
            pen = QPen(QColor("white"))
            pen.setWidth(self.width() / 50)
            painter.setPen(pen)
            painter.drawText(QRect(x, y, r, r), Qt.AlignCenter, self.text)

        painter.end()

    def set(self, b):
        self.state = b
        self.error = False
        self.update()


class NunchukThread(QThread):

    new_data = pyqtSignal(list)
    error = pyqtSignal()

    def __init__(self, parent):
        super(NunchukThread, self).__init__(parent)

    def run(self):
        try:
            self.bus = smbus.SMBus(1)
            self.bus.write_byte_data(0x52, 0x40, 0x00)
        except IOError as e:
            print(e)
            solved = False
            while not solved:
                self.error.emit()
                try:
                    self.bus = smbus.SMBus(1)
                    self.bus.write_byte_data(0x52, 0x40, 0x00)
                    solved = True
                except IOError as f:
                    print(f)
                time.sleep(0.1)
        while True:
            try:
                self.bus.write_byte(0x52, 0x00)
                data0 = self.bus.read_byte(0x52)
                data1 = self.bus.read_byte(0x52)
                data2 = self.bus.read_byte(0x52)
                data3 = self.bus.read_byte(0x52)
                data4 = self.bus.read_byte(0x52)
                data5 = self.bus.read_byte(0x52)
                joy_x = data0
                joy_y = data1
                accel_x = (data2 << 2) + ((data5 & 0x0c) >> 2)
                accel_y = (data3 << 2) + ((data5 & 0x30) >> 4)
                accel_z = (data4 << 2) + ((data5 & 0xc0) >> 6)
                buttons = data5 & 0x03
                button_c = (buttons == 1) or (buttons == 2)
                button_z = (buttons == 0) or (buttons == 2)
                joy = {}
                acc = {}
                but = {}
                joy['x'] = joy_x
                joy['y'] = joy_y
                acc['x'] = accel_x
                acc['y'] = accel_y
                acc['z'] = accel_z
                but['c'] = button_c
                but['z'] = button_z
                self.new_data.emit([joy, acc, but])
            except IOError as e:
                print(e)
                solved = False
                while not solved:
                    self.error.emit()
                    try:
                        self.bus = smbus.SMBus(1)
                        self.bus.write_byte_data(0x52, 0x40, 0x00)
                        solved = True
                    except IOError as f:
                        print(f)
                    time.sleep(0.1)


class TouchGuiApplication(TouchApplication):

    def __init__(self, args):
        TouchApplication.__init__(self, args)

        # create the empty main window
        self.name = "Nunchuk"
        self.w = TouchWindow(self.name)
        self.vbox = QVBoxLayout()

        self.thread = NunchukThread(self.w)
        self.thread.new_data.connect(self.on_data)
        self.thread.error.connect(self.on_error)
        self.thread.start()

        self.xyz_hbox = QHBoxLayout()

        self.joy_widget = Axes2dWidget()
        self.xyz_hbox.addWidget(self.joy_widget)
        self.accxy_widget = Axes2dWidget()
        self.xyz_hbox.addWidget(self.accxy_widget)

        self.but_hbox = QHBoxLayout()

        self.c = ButtonWidget("C")
        self.but_hbox.addWidget(self.c)
        self.z = ButtonWidget("Z")
        self.but_hbox.addWidget(self.z)

        self.vbox.addLayout(self.xyz_hbox)
        self.vbox.addLayout(self.but_hbox)
        self.w.centralWidget.setLayout(self.vbox)
        self.w.show()
        self.exec_()

    def on_data(self, data):
        self.w.titlebar.setText(self.name)
        self.w.titlebar.setStyleSheet('')
        self.joy_widget.set((data[0]['x'] - 128) / 128, (data[0]['y'] - 128) / -128, None)
        if (data[1]['z'] - 250) * 0.51 < 0:
            c = 0
        elif (data[1]['z'] - 250) * 0.51 > 255:
            c = 255
        else:
            c = (data[1]['z'] - 250) * 0.51
        self.accxy_widget.set((data[1]['x'] - 500) / 500, (data[1]['y'] - 500) / -500, QColor(c, c, c))
        self.c.set(data[2]['c'])
        self.z.set(data[2]['z'])

    def on_error(self):
        self.c.error = True
        self.c.update()
        self.z.error = True
        self.z.update()
        self.joy_widget.error = True
        self.joy_widget.update()
        self.accxy_widget.error = True
        self.accxy_widget.update()
        self.w.titlebar.setText("Error")
        self.w.titlebar.setStyleSheet('color: red')

if __name__ == "__main__":
    TouchGuiApplication(sys.argv)
