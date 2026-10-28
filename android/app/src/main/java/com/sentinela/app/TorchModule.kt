package com.sentinela.app

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TorchModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "TorchModule"

    private var isTorchOn = false

    @ReactMethod
    fun setKeepScreenOn(enabled: Boolean, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            try {
                if (enabled) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
                promise.resolve(enabled)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun setTorch(enabled: Boolean, promise: Promise) {
        try {
            val cameraManager = reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
            if (cameraManager == null) {
                promise.reject("UNAVAILABLE", "Camera service not available")
                return
            }

            val cameraIdList = cameraManager.cameraIdList
            var torchCameraId: String? = null
            for (id in cameraIdList) {
                val characteristics = cameraManager.getCameraCharacteristics(id)
                val hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                if (hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK) {
                    torchCameraId = id
                    break
                }
            }

            if (torchCameraId == null && cameraIdList.isNotEmpty()) {
                torchCameraId = cameraIdList[0]
            }

            if (torchCameraId != null) {
                cameraManager.setTorchMode(torchCameraId, enabled)
                isTorchOn = enabled
                promise.resolve(enabled)
            } else {
                promise.reject("NO_FLASH", "No flashlight found on device")
            }
        } catch (e: Exception) {
            promise.reject("TORCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun toggleTorch(promise: Promise) {
        setTorch(!isTorchOn, promise)
    }

    @ReactMethod
    fun getTorchStatus(promise: Promise) {
        promise.resolve(isTorchOn)
    }
}
