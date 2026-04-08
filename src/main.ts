import { mount } from 'svelte'
import { getSerwist } from 'virtual:serwist'
import './app.css'
import App from './App.svelte'

if ('serviceWorker' in navigator) {
  void getSerwist().then((serwist) => {
    void serwist?.register()
  })
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
