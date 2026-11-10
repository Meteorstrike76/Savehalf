import {Component,type ReactNode} from 'react';

export default class AppErrorBoundary extends Component<
 {children:ReactNode},{failed:boolean}
>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(this.state.failed)return <main className="wrap" role="alert">
   <h1>SaveHalf could not open this view</h1>
   <p>Your saved browser data has not been cleared. Reload to try again.</p>
   <button onClick={()=>window.location.reload()}>Reload SaveHalf</button>
  </main>;
  return this.props.children;
 }
}
