#! /usr/bin/env python3
# -*- coding: utf-8 -*-
#

import sys
from TouchStyle import *
import time
import Adafruit_BMP.BMP085 as BMP085


class BMP_Thread(QThread):

    new_data = pyqtSignal(list)
    error = pyqtSignal()

    def __init__(self, parent):
        super(BMP_Thread, self).__init__(parent)

    def run(self):
        try:
            sensor = BMP085.BMP085(busnum=1, mode=BMP085.BMP085_ULTRAHIGHRES)
        except OSError as e:
            print(e)
            solved = False
            while not solved:
                self.error.emit()
                try:
                    sensor = BMP085.BMP085(busnum=1, mode=BMP085.BMP085_ULTRAHIGHRES)
                    solved = True
                except OSError as f:
                    print(f)
                time.sleep(0.1)
        while True:
            try:
                self.new_data.emit([sensor.read_pressure(), sensor.read_temperature()])
            except OSError as e:
                print(e)
                solved = False
                while not solved:
                    self.error.emit()
                    try:
                        sensor = BMP085.BMP085(busnum=1, mode=BMP085.BMP085_ULTRAHIGHRES)
                        solved = True
                    except OSError as f:
                        print(f)
                    time.sleep(0.1)


class EntryWidget(QWidget):
    pressed = pyqtSignal()

    def __init__(self, title, parent=None):
        QWidget.__init__(self, parent)

        self.layout = QVBoxLayout()
        self.layout.setSpacing(0)
        self.title = QLabel(title)
        self.layout.addWidget(self.title)
        self.value = QLabel("")
        self.value.setObjectName("smalllabel")
        self.value.setWordWrap(True)
        self.layout.addWidget(self.value)
        self.setLayout(self.layout)

    def setText(self, str):
        self.value.setText(str)

    def mousePressEvent(self, event):
        self.pressed.emit()


class QNH_Dialog(TouchDialog):

    def __init__(self, parent, qnh):
        TouchDialog.__init__(self, "QNH", parent)
        self.vbox = QVBoxLayout()
        self.vbox.addStretch()
        self.vbox.addWidget(QLabel("QNH [hPa]:"))
        self.spin = QDoubleSpinBox()
        self.spin.setRange(0, 2000)
        self.spin.setSingleStep(0.1)
        self.spin.setValue(qnh)
        self.spin.setStyleSheet("""QDoubleSpinBox { border: 3px inset grey; }
                                QDoubleSpinBox::up-button { subcontrol-position: left; width: 40px; height: 35px;}
                                QDoubleSpinBox::down-button { subcontrol-position: right; width: 40px; height: 35px;}""")
        self.vbox.addWidget(self.spin)
        self.vbox.addStretch()
        self.centralWidget.setLayout(self.vbox)


class TouchGuiApplication(TouchApplication):

    def __init__(self, args):
        TouchApplication.__init__(self, args)

        self.qnh = 1013.2

        # create the empty main window
        self.name = "Barometer"
        self.w = TouchWindow(self.name)
        self.vbox = QVBoxLayout()

        self.thread = BMP_Thread(self.w)
        self.thread.new_data.connect(self.on_data)
        self.thread.error.connect(self.on_error)
        self.thread.start()

        self.pressure_label = EntryWidget("Pressure")
        self.vbox.addWidget(self.pressure_label)

        self.temperature_label = EntryWidget("Temperature")
        self.vbox.addWidget(self.temperature_label)

        self.altitude_label = EntryWidget("Altitude")
        self.vbox.addWidget(self.altitude_label)

        self.qnh_label = EntryWidget("QNH Click to edit")
        self.qnh_label.setText(str("{0:.1f}".format(self.qnh)) + "hPA")
        self.qnh_label.pressed.connect(self.on_QNH)
        self.qnh_label.pressed.connect(self.reset_QNH_Text)
        self.vbox.addWidget(self.qnh_label)

        self.w.centralWidget.setLayout(self.vbox)
        self.w.show()
        self.exec_()

    def on_data(self, data):
        self.w.titlebar.setText(self.name)
        self.w.titlebar.setStyleSheet('')
        self.pressure_label.title.setStyleSheet('')
        self.temperature_label.title.setStyleSheet('')
        self.altitude_label.title.setStyleSheet('')

        self.pressure_label.setText(str("{0:.1f}".format(data[0] / 100)) + "hPA")
        self.temperature_label.setText(str("{0:.1f}".format(data[1])) + "°C")
        altitude = 44330.0 * (1.0 - pow(data[0] / self.qnh / 100, (1.0 / 5.255)))
        self.altitude_label.setText(str("{0:.2f}".format(altitude)) + "m")

    def on_error(self):
        self.w.titlebar.setText("Error")
        self.w.titlebar.setStyleSheet('color: red')

        self.pressure_label.setText("Error")
        self.pressure_label.title.setStyleSheet('color: red')
        self.temperature_label.setText("Error")
        self.temperature_label.title.setStyleSheet('color: red')
        self.altitude_label.setText("Error")
        self.altitude_label.title.setStyleSheet('color: red')

    def on_QNH(self):
        dialog = QNH_Dialog(self.w, self.qnh)
        dialog.exec_()
        self.qnh = dialog.spin.value()
        self.qnh_label.setText(str("{0:.1f}".format(self.qnh)) + "hPA")

    def reset_QNH_Text(self):
        self.qnh_label.title.setText("QNH")

if __name__ == "__main__":
    TouchGuiApplication(sys.argv)
